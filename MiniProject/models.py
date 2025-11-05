from datetime import datetime

class User:
    def __init__(self, username, email, password, role="bidder"):
        self.username = username
        self.email = email
        self.password = password
        self.role = role

class Crop:
    def __init__(self, name, price, quantity, farmer_id, crop_type="vegetable", quality="A+", notes="", image=""):
        self.name = name
        self.type = crop_type
        self.quality = quality
        self.price = price
        self.quantity = quantity
        self.datetime = datetime.utcnow()
        self.status = "Growing"
        self.sold = False
        self.notes = notes
        self.image = image
        self.farmer_id = farmer_id

class Bid:
    def __init__(self, crop_id, bidder_id, bid_price):
        self.crop_id = crop_id
        self.bidder_id = bidder_id
        self.bid_price = bid_price
        self.timestamp = datetime.utcnow()
