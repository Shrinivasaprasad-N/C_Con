# crud.py
from bson.objectid import ObjectId
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "crop_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# -------------------- USERS --------------------

def get_user_by_email(email):
    return db.users.find_one({"email": email})


def get_user_by_id(user_id):
    try:
        return db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


def create_user(user_data):
    return db.users.insert_one(user_data)


# -------------------- CROPS --------------------

def create_crop(crop_data):
    """
    Insert a new crop with normalized structure and default values.
    """
    # Normalize datetime
    if "datetime" in crop_data:
        try:
            if isinstance(crop_data["datetime"], datetime):
                crop_data["datetime"] = crop_data["datetime"].isoformat()
            else:
                _ = datetime.fromisoformat(crop_data["datetime"])
        except Exception:
            crop_data["datetime"] = datetime.utcnow().isoformat()
    else:
        crop_data["datetime"] = datetime.utcnow().isoformat()

    # Default location
    crop_data["location"] = crop_data.get("location", "").strip() or "Not specified"

    # Ensure numeric fields
    for key in ["price", "quantity"]:
        try:
            crop_data[key] = float(crop_data.get(key, 0) or 0)
        except Exception:
            crop_data[key] = 0.0

    # Handle images
    images = []
    if "images" in crop_data and isinstance(crop_data["images"], list):
        images = crop_data["images"]
    elif "image" in crop_data and crop_data["image"]:
        images = [crop_data["image"]]

    if not images:
        images = ["/static/default_crop.jpg"]

    crop_data["images"] = images
    crop_data["image"] = images[0]

    # Defaults
    crop_data["name"] = crop_data.get("name", "").strip() or "Unnamed"
    crop_data["type"] = crop_data.get("type", "").strip() or "-"
    crop_data["quality"] = crop_data.get("quality", "").strip() or "-"
    crop_data["status"] = crop_data.get("status", "Available")
    crop_data["sold"] = bool(crop_data.get("sold", False))
    crop_data["notes"] = crop_data.get("notes", "").strip()

    return db.crops.insert_one(crop_data)


def get_crops():
    """
    Fetch all crops, normalized.
    """
    crops = list(db.crops.find())
    for c in crops:
        c["_id"] = str(c["_id"])
        if "images" not in c or not isinstance(c["images"], list):
            c["images"] = [c.get("image", "/static/default_crop.jpg")]
        c["image"] = c.get("image") or c["images"][0]
    return crops


def get_crop(crop_id):
    """
    Fetch single crop by ID.
    """
    try:
        crop = db.crops.find_one({"_id": ObjectId(crop_id)})
    except Exception:
        return None

    if crop:
        crop["_id"] = str(crop["_id"])
        if "images" not in crop or not isinstance(crop["images"], list):
            crop["images"] = [crop.get("image", "/static/default_crop.jpg")]
        crop["image"] = crop.get("image") or crop["images"][0]
    return crop


def update_crop(crop_id, crop_data):
    """
    Update crop details.
    """
    crop_data.pop("_id", None)
    crop_data["location"] = crop_data.get("location", "").strip() or "Not specified"

    for key in ["price", "quantity"]:
        if key in crop_data:
            try:
                crop_data[key] = float(crop_data[key])
            except Exception:
                crop_data[key] = 0.0

    if "images" in crop_data and isinstance(crop_data["images"], list):
        crop_data["image"] = crop_data["images"][0]

    return db.crops.update_one({"_id": ObjectId(crop_id)}, {"$set": crop_data})


def delete_crop(crop_id):
    """
    Delete crop by ID safely.
    """
    try:
        return db.crops.delete_one({"_id": ObjectId(crop_id)})
    except Exception as e:
        print("Error deleting crop:", e)
        return None


# -------------------- BIDS --------------------

def place_bid(bid_data):
    """
    Add new bid document.
    """
    try:
        bid_data["crop_id"] = ObjectId(bid_data["crop_id"])
        bid_data["bidder_id"] = ObjectId(bid_data["bidder_id"])
        bid_data["timestamp"] = datetime.utcnow().isoformat()
        return db.bids.insert_one(bid_data)
    except Exception as e:
        print("Error placing bid:", e)
        return None


def get_bids_for_crop(crop_id):
    try:
        oid = ObjectId(crop_id)
    except Exception:
        return []

    bids = list(db.bids.find({"crop_id": oid}).sort("bid_price", -1))
    for b in bids:
        b["_id"] = str(b["_id"])
        b["crop_id"] = str(b["crop_id"])
        b["bidder_id"] = str(b["bidder_id"])
    return bids


def get_highest_bid(crop_id):
    bids = get_bids_for_crop(crop_id)
    return bids[0] if bids else None


# -------------------- AUCTION WINNERS --------------------

def set_auction_winner(crop_id, user_id):
    try:
        db.auction_winners.update_one(
            {"crop_id": ObjectId(crop_id)},
            {
                "$set": {
                    "user_id": ObjectId(user_id),
                    "assigned_at": datetime.utcnow().isoformat()
                }
            },
            upsert=True
        )
    except Exception as e:
        print("Error setting winner:", e)


def get_auction_winner(crop_id):
    try:
        row = db.auction_winners.find_one({"crop_id": ObjectId(crop_id)})
    except Exception:
        return None

    if not row:
        return None

    row["_id"] = str(row["_id"])
    row["crop_id"] = str(row["crop_id"])
    row["user_id"] = str(row["user_id"])
    return row


# -------------------- CHAT SYSTEM --------------------

def send_message(crop_id, sender_id, receiver_id, message):
    """
    Insert a chat message.
    """
    try:
        doc = {
            "crop_id": ObjectId(crop_id),
            "sender_id": ObjectId(sender_id),
            "receiver_id": ObjectId(receiver_id),
            "message": str(message),
            "timestamp": datetime.utcnow().isoformat()
        }
        return db.chats.insert_one(doc)
    except Exception as e:
        print("Error sending message:", e)
        return None


def get_messages_for_crop(crop_id):
    try:
        oid = ObjectId(crop_id)
    except Exception:
        return []

    msgs = list(db.chats.find({"crop_id": oid}).sort("timestamp", 1))
    for m in msgs:
        m["_id"] = str(m["_id"])
        m["crop_id"] = str(m["crop_id"])
        m["sender_id"] = str(m["sender_id"])
        m["receiver_id"] = str(m["receiver_id"])
    return msgs


# -------------------- UTILITIES --------------------

def ensure_indexes():
    """
    Create helpful indexes.
    """
    try:
        db.crops.create_index("datetime")
        db.crops.create_index("location")
        db.bids.create_index([("crop_id", 1), ("bid_price", -1)])
        db.chats.create_index([("crop_id", 1), ("timestamp", 1)])
    except Exception as e:
        print("Index creation failed:", e)
