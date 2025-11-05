// Fetch crop from localStorage
let currentCrop = JSON.parse(localStorage.getItem("currentBidCrop"));
if (!currentCrop) {
    alert("No crop selected for bidding!");
    window.location.href = "/b_portal"; // redirect back
}

// Elements
const cropNameEl = document.getElementById("cropName");
const cropQuantityEl = document.getElementById("cropQuantity");
const cropQualityEl = document.getElementById("cropQuality");
const basePriceEl = document.getElementById("basePrice");
const currentPriceEl = document.getElementById("currentPrice");
const cropImageEl = document.getElementById("cropImage");
const timerEl = document.getElementById("timer");
const bidInput = document.getElementById("bidInput");
const placeBidBtn = document.getElementById("placeBidBtn");

let currentPrice = currentCrop.price || 0;

// Display crop info
cropNameEl.innerText = currentCrop.name;
cropQuantityEl.innerText = currentCrop.quantity;
cropQualityEl.innerText = currentCrop.quality;
basePriceEl.innerText = currentCrop.price;
currentPriceEl.innerText = currentPrice;
cropImageEl.src = currentCrop.image;

// Countdown timer (1 hour from crop datetime)
let endTime = new Date(new Date(currentCrop.datetime).getTime() + 60*60*1000);

// -------------------- Winner Handling --------------------
let currentUser = JSON.parse(localStorage.getItem("loggedInUser")) || { email: "bidder@example.com" }; // fallback

function updateTimer() {
    let now = new Date();
    let diff = endTime - now;

    if (diff <= 0) {
        timerEl.innerText = "Bidding Closed";
        bidInput.disabled = true;
        placeBidBtn.disabled = true;
        clearInterval(timerInterval);

        // Save winner in localStorage
        let winners = JSON.parse(localStorage.getItem("auctionWinners")) || {};
        winners[currentCrop._id || currentCrop.id] = currentUser.email;
        localStorage.setItem("auctionWinners", JSON.stringify(winners));

        alert(`Bidding ended! Winner: ${currentUser.email}`);
        return;
    }

    let hrs = Math.floor(diff / (1000*60*60));
    let mins = Math.floor((diff % (1000*60*60)) / (1000*60));
    let secs = Math.floor((diff % (1000*60)) / 1000);
    timerEl.innerText = `Time Left: ${hrs}h ${mins}m ${secs}s`;
}

let timerInterval = setInterval(updateTimer, 1000);
updateTimer();

// -------------------- Place Bid --------------------
placeBidBtn.addEventListener("click", () => {
    let bidValue = parseFloat(bidInput.value);
    if (!bidValue || bidValue <= currentPrice) {
        alert(`Your bid must be higher than current price ₹${currentPrice}`);
        return;
    }

    currentPrice = bidValue;
    currentPriceEl.innerText = currentPrice;

    // Optional: Save highest bid in localStorage
    let bids = JSON.parse(localStorage.getItem("auctionBids")) || {};
    bids[currentCrop._id || currentCrop.id] = { user: currentUser.email, bid: currentPrice };
    localStorage.setItem("auctionBids", JSON.stringify(bids));

    alert(`Bid placed successfully at ₹${currentPrice}`);
});
