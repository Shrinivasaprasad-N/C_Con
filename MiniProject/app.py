from flask import Flask, request, jsonify, render_template, session, redirect
from flask_cors import CORS
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import bcrypt
import os
from flask_pymongo import PyMongo

# Import CRUD functions from your module
from crud import (
    get_user_by_email, create_user, get_crops, create_crop,
    update_crop, delete_crop, get_crop, get_highest_bid,
    place_bid as crud_place_bid, get_auction_winner, db
)

app = Flask(__name__, static_folder='static', template_folder='templates')

app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key")
CORS(app, supports_credentials=True)

mongo = PyMongo()
app.config["MONGO_URI"] = "mongodb://localhost:27017/crop_connect"
mongo.init_app(app)


# Basic routes
@app.route("/", methods=["GET"])
def register():
    return render_template("register.html")


@app.route("/login", methods=["GET"])
def login():
    return render_template("login.html")


@app.route("/farmerportal")
def farmer_portal():
    return render_template("f_portal.html")


@app.route("/bidderportal")
def bidder_portal():
    return render_template("b_portal.html")

@app.route("/wishlist")
def wishlist_page():
    return render_template("wishlist.html")

@app.route('/bid_portal')
def bid_portal():
    return render_template('bidding/bid_portal.html')




# Authentication APIs
@app.route("/api/auth/register", methods=["POST"])
def register_api():
    data = request.get_json()
    if not data or not all(k in data for k in ("username", "email", "password")):
        return jsonify({"error": "Missing required fields"}), 400
    if get_user_by_email(data["email"]):
        return jsonify({"error": "Email already exists"}), 400
    hashed_pw = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt())
    user = {
        "username": data["username"],
        "email": data["email"],
        "password": hashed_pw,
        "role": data.get("role", "bidder")
    }
    create_user(user)
    return jsonify({"message": "User registered successfully"}), 201


@app.route("/api/auth/login", methods=["POST"])
def login_api():
    data = request.get_json()
    if not data or not all(k in data for k in ("email", "password")):
        return jsonify({"error": "Missing credentials"}), 400
    user = get_user_by_email(data["email"])
    if not user or not bcrypt.checkpw(data["password"].encode(), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 400
    session["logged_in_user"] = {
        "id": str(user["_id"]),
        "username": user.get("username"),
        "role": user.get("role", "bidder"),
        "email": user.get("email")
    }
    return jsonify({
        "message": "Login successful",
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "role": user["role"],
            "email": user["email"]
        }
    }), 200


@app.route("/api/auth/logout", methods=["POST"])
def logout_api():
    session.pop("logged_in_user", None)
    return jsonify({"message": "Logged out"}), 200


# Helper to check if string is data URL
def _is_data_url(s: str):
    return isinstance(s, str) and s.startswith("data:")


# List crops API filtering by status and expiration
@app.route("/api/crops", methods=["GET"])
def list_crops():
    crops = get_crops()
    now = datetime.utcnow()
    valid_crops = []
    for c in crops:
        c["_id"] = str(c["_id"])
        end_time = None
        if c.get("datetime"):
            try:
                end_time = datetime.fromisoformat(c["datetime"]) + timedelta(hours=1)
            except Exception:
                pass
        # show if not expired or status not closed/sold
        if c.get("status", "").lower() not in ["closed", "sold"]:
            valid_crops.append(c)
        elif end_time and now < end_time:
            valid_crops.append(c)
    return jsonify(valid_crops), 200


# Add crop API: handle files, data URLs, session farmer info
@app.route("/api/crops", methods=["POST"])
def add_crop():
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form.to_dict()

    user = session.get("logged_in_user")
    if user:
        data["farmer_id"] = user.get("id")
        data["farmer_name"] = user.get("username")
        data["farmer_email"] = user.get("email")

    for key in ["price", "quantity"]:
        if key in data and data[key] != "":
            try:
                data[key] = float(data[key])
            except Exception:
                data[key] = 0.0

    if data.get("datetime"):
        try:
            _ = datetime.fromisoformat(data["datetime"])
        except Exception:
            data["datetime"] = datetime.utcnow().isoformat()
    else:
        data["datetime"] = datetime.utcnow().isoformat()

    data["location"] = data.get("location", "").strip() or "Not specified"

    images = []
    if request.is_json and data.get("images"):
        if isinstance(data["images"], list):
            images = [img for img in data["images"] if _is_data_url(img)]
        elif _is_data_url(data["images"]):
            images.append(data["images"])
    else:
        upload_folder = os.path.join(app.static_folder, "uploads")
        os.makedirs(upload_folder, exist_ok=True)
        files = request.files.getlist("cropImages") or [request.files.get("cropImage")]
        for f in files:
            if f and f.filename != "":
                path = os.path.join(upload_folder, f.filename)
                f.save(path)
                images.append("/" + os.path.relpath(path, start=".").replace("\\", "/"))
    if not images:
        images = ["/static/default_crop.jpg"]

    data["image"] = images[0]
    data["images"] = images
    data["status"] = "Available"
    result = create_crop(data)
    return jsonify({"message": "Crop added successfully", "id": str(result.inserted_id)}), 201


# Edit crop API supporting both JSON and multipart/form-data for images
@app.route("/api/crops/<crop_id>", methods=["PUT"])
def edit_crop(crop_id):
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form.to_dict()

    if not data:
        return jsonify({"error": "Invalid data"}), 400

    for key in ["price", "quantity"]:
        if key in data and data[key] != "":
            try:
                data[key] = float(data[key])
            except Exception:
                pass

    data["location"] = data.get("location", "").strip() or "Not specified"

    new_images = []
    if request.is_json and data.get("images"):
        if isinstance(data["images"], list):
            new_images = [img for img in data["images"] if _is_data_url(img)]
    else:
        files = request.files.getlist("cropImages")
        if not files:
            single = request.files.get("cropImage")
            if single:
                files = [single]

        upload_folder = os.path.join(app.static_folder, "uploads")
        os.makedirs(upload_folder, exist_ok=True)
        for f in files:
            if f and f.filename != "":
                path = os.path.join(upload_folder, f.filename)
                f.save(path)
                new_images.append("/" + os.path.relpath(path, start=".").replace("\\", "/"))

    if new_images:
        data["images"] = new_images
        data["image"] = new_images[0]

    # preserve farmer info if logged in as farmer (session)
    user = session.get("logged_in_user")
    if user and user.get("role") == "farmer":
        if not data.get("farmer_id"):
            data["farmer_id"] = user.get("id")
            data["farmer_name"] = user.get("username")
            data["farmer_email"] = user.get("email")

    result = update_crop(crop_id, data)
    if getattr(result, "modified_count", 0) == 0:
        existing = get_crop(crop_id)
        if not existing:
            return jsonify({"error": "Crop not found"}), 404
    return jsonify({"message": "Crop updated"}), 200


# Delete crop API with cascade cleanup (attempt best-effort)
@app.route("/api/crops/<crop_id>", methods=["DELETE"])
def remove_crop(crop_id):
    try:
        crop_oid = ObjectId(crop_id)
    except Exception:
        return jsonify({"error": "Invalid crop ID"}), 400

    try:
        db.messages.delete_many({"crop_id": crop_oid})
    except Exception:
        pass
    try:
        db.bids.delete_many({"crop_id": crop_oid})
    except Exception:
        pass
    try:
        db.wishlist.delete_many({"crop_id": crop_oid})
    except Exception:
        pass

    result = delete_crop(crop_id)
    if not result or getattr(result, "deleted_count", 0) == 0:
        return jsonify({"error": "Crop not found"}), 404
    return jsonify({"message": "Crop deleted"}), 200


# Bidding API with proper ObjectId conversion and validation
@app.route("/api/bids/<crop_id>", methods=["POST"])
def place_bid(crop_id):
    try:
        data = request.get_json()
        bidder_id = data.get("bidder_id")
        bid_price = data.get("bid_price")
        if not bidder_id or not bid_price:
            return jsonify({"error": "Missing bidder_id or bid_price"}), 400

        crop_oid = ObjectId(crop_id)
        bidder_oid = ObjectId(bidder_id)
        bid_price_float = float(bid_price)

        crop = mongo.db.crops.find_one({"_id": crop_oid})
        if not crop:
            return jsonify({"error": "Crop not found"}), 404

        if crop.get("status") in ["closed", "sold"]:
            return jsonify({"error": "Bidding closed for this crop"}), 400

        current_price = float(crop.get("price", 0))
        if bid_price_float <= current_price:
            return jsonify({"error": "Bid must be higher than current price"}), 400

        mongo.db.crops.update_one(
            {"_id": crop_oid},
            {"$set": {"price": bid_price_float, "highest_bidder": bidder_oid}}
        )
        mongo.db.bids.insert_one({
            "crop_id": crop_oid,
            "bidder_id": bidder_oid,
            "bid_price": bid_price_float,
            "timestamp": datetime.utcnow()
        })
        return jsonify({"message": "Bid placed successfully!"}), 200
    except Exception as e:
        print("Error placing bid:", e)
        return jsonify({"error": "Internal Server Error"}), 500


# Wishlist APIs
@app.route("/api/wishlist/<user_id>", methods=["GET"])
def get_wishlist(user_id):
    wishlist = db.wishlist.find({"user_id": ObjectId(user_id)})
    result = []
    for item in wishlist:
        item["_id"] = str(item["_id"])
        item["crop_id"] = str(item["crop_id"])
        item["user_id"] = str(item["user_id"])
        result.append(item)
    return jsonify(result), 200


@app.route("/api/wishlist", methods=["POST"])
def add_to_wishlist():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing wishlist data"}), 400

    exists = db.wishlist.find_one({
        "user_id": ObjectId(data["user_id"]),
        "crop_id": ObjectId(data["crop_id"])
    })
    if exists:
        return jsonify({"error": "Already in wishlist"}), 400

    db.wishlist.insert_one({
        "user_id": ObjectId(data["user_id"]),
        "crop_id": ObjectId(data["crop_id"]),
        "added_at": datetime.utcnow()
    })
    return jsonify({"message": "Added to wishlist"}), 201


# Auction winner API
@app.route("/api/auction/winner/<crop_id>", methods=["GET"])
def auction_winner(crop_id):
    winner = get_auction_winner(crop_id)
    if winner:
        winner["user_id"] = str(winner["user_id"])
        winner["crop_id"] = str(winner["crop_id"])
    return jsonify(winner), 200


# Chat system APIs
@app.route("/api/messages/<crop_id>", methods=["GET"])
def get_messages(crop_id):
    try:
        crop_oid = ObjectId(crop_id)
    except Exception:
        return jsonify([]), 200

    messages = list(db.messages.find({"crop_id": crop_oid}).sort("timestamp", 1))
    out = []
    for msg in messages:
        msg_obj = {
            "_id": str(msg["_id"]),
            "crop_id": str(msg["crop_id"]),
            "sender_id": str(msg["sender_id"]),
            "receiver_id": str(msg["receiver_id"]),
            "message": msg.get("message", ""),
            "timestamp": msg.get("timestamp", datetime.utcnow()).isoformat()
        }
        try:
            sender = db.users.find_one({"_id": ObjectId(msg["sender_id"])})
            receiver = db.users.find_one({"_id": ObjectId(msg["receiver_id"])})
            msg_obj["sender_name"] = sender["username"] if sender else "Unknown"
            msg_obj["receiver_name"] = receiver["username"] if receiver else "Unknown"
        except Exception:
            msg_obj["sender_name"] = "Unknown"
            msg_obj["receiver_name"] = "Unknown"
        out.append(msg_obj)
    return jsonify(out), 200


@app.route("/api/messages", methods=["POST"])
def send_message():
    data = request.get_json()
    required = ["crop_id", "sender_id", "receiver_id", "message"]
    if not data or not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        db.messages.insert_one({
            "crop_id": ObjectId(data["crop_id"]),
            "sender_id": ObjectId(data["sender_id"]),
            "receiver_id": ObjectId(data["receiver_id"]),
            "message": data["message"].strip(),
            "timestamp": datetime.utcnow()
        })
        return jsonify({"message": "Message sent"}), 201
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 400


# Chat page render with permissions
@app.route("/chat")
def chat():
    crop_id = request.args.get("crop_id")
    if not crop_id:
        return "Invalid crop ID", 400
    crop = get_crop(crop_id)
    if not crop:
        return "Crop not found", 404

    user = session.get("logged_in_user")
    if not user:
        return redirect("/login")

    role = user.get("role")
    partner_id = None
    partner_name = None
    winner = get_auction_winner(crop_id)
    winner_user_id = str(winner.get("user_id")) if winner and winner.get("user_id") else None

    if role == "bidder":
        if not winner_user_id or winner_user_id != user.get("id"):
            return "Not authorized.", 403
        partner_id = crop.get("farmer_id")
        partner_name = crop.get("farmer_name", "Farmer")
    elif role == "farmer":
        if str(crop.get("farmer_id")) != user.get("id"):
            return "Not your crop.", 403
        if not winner_user_id:
            return "No winner yet.", 400
        partner_id = winner_user_id
        bidder = db.users.find_one({"_id": ObjectId(partner_id)})
        partner_name = bidder["username"] if bidder else "Winning Bidder"
    else:
        return "Invalid role", 403

    return render_template(
        "chat.html",
        crop_id=crop_id,
        partner_id=partner_id,
        partner_name=partner_name,
        user=user
    )


if __name__ == "__main__":
    app.run(debug=True)
