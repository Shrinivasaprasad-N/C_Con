// 🌾 bidder_portal.js — Final version (show open crops only, wishlist works fully, redirect to bid_portal)

// -------------------- GLOBAL VARIABLES --------------------
let crops = [];
let wishlist = [];
let currentUser = {};
let cropsContainer = null;
let noCropsMessage = null;
let wishlistCountEl = null;
let searchInput = null;
let filterBtn = null;
let locationInput = null;

// -------------------- HELPER FUNCTIONS --------------------
function getIdOf(crop) {
  return crop._id || crop.id || crop._id_str || crop.id_str || "";
}

function getCropName(crop) {
  return crop.name || crop.crop_name || "Unnamed";
}

function getFarmerName(crop) {
  return crop.farmer_name || crop.farmer || crop.uploaded_by_name || "Unknown";
}

function getCropImage(crop) {
  return crop.image || (crop.images && crop.images[0]) || "/static/default_crop.jpg";
}

function biddingEndsAt(datetime) {
  if (!datetime) return null;
  const t = new Date(datetime).getTime();
  if (isNaN(t)) return null;
  return t + 3600 * 1000; // 1 hour after posting
}

function isBiddingOpen(crop) {
  const now = Date.now();
  const end = biddingEndsAt(crop.datetime || crop.time);
  if (end === null) return true;
  return now < end;
}

// -------------------- FETCH CROPS --------------------
async function fetchCrops() {
  try {
    const res = await fetch("/api/crops");
    if (!res.ok) throw new Error("Failed to fetch crops");
    crops = await res.json();

    // Ensure unique IDs
    crops = crops.map(c => ({ ...c, _id: getIdOf(c) }));

    // Only open (not closed or sold)
    const openCrops = crops.filter(c => {
      const status = (c.status || "").toLowerCase();
      return status !== "closed" && status !== "sold" && isBiddingOpen(c);
    });

    displayCrops(openCrops);
  } catch (err) {
    console.error("❌ Error fetching crops:", err);
    if (cropsContainer)
      cropsContainer.innerHTML = `<p style="color:red;">Error loading crops.</p>`;
  }
}

// -------------------- DISPLAY CROPS --------------------
function displayCrops(cropsData) {
  if (!cropsContainer) return;
  cropsContainer.innerHTML = "";

  if (!cropsData || cropsData.length === 0) {
    if (noCropsMessage) noCropsMessage.style.display = "block";
    cropsContainer.innerHTML = `<p>No crops available for bidding.</p>`;
    return;
  } else {
    if (noCropsMessage) noCropsMessage.style.display = "none";
  }

  cropsData.forEach(crop => {
    const id = getIdOf(crop);
    const isWishlisted = wishlist.some(item => getIdOf(item) === id);

    const card = document.createElement("div");
    card.className = "crop-card";

    card.innerHTML = `
      <img src="${getCropImage(crop)}" alt="${getCropName(crop)}" class="crop-img" />
      <h3 class="crop-title">${getCropName(crop)}</h3>
      <p>Price: ₹${crop.price ?? 0}</p>
      <p>Quantity: ${crop.quantity ?? "-"} kg</p>
      <p>Farmer: ${getFarmerName(crop)}</p>
      <p>Location: ${crop.location || "N/A"}</p>
      <p><span id="timer-${id}" class="timer"></span></p>
      <div class="btn-row">
        <button class="wishlist-btn" data-id="${id}">
          ${isWishlisted ? "❤️ Remove" : "🤍 Wishlist"}
        </button>
        <button class="bid-btn" data-id="${id}" data-price="${crop.price ?? 0}">💰 Place Bid</button>
        <button class="chat-btn" data-id="${id}">💬 Chat</button>
        <button class="details-btn" data-id="${id}">🔎 Details</button>
      </div>
    `;

    // Wishlist button
    card.querySelector(".wishlist-btn").addEventListener("click", (e) => {
      toggleWishlist(crop);
      e.currentTarget.textContent = wishlist.some(item => getIdOf(item) === id)
        ? "❤️ Remove"
        : "🤍 Wishlist";
    });

    // Place Bid button — redirects to bid_portal
    card.querySelector(".bid-btn").addEventListener("click", () => {
      localStorage.setItem("currentBidCrop", JSON.stringify(crop));
      window.location.href = "/bid_portal";
    });

    // Chat button
    card.querySelector(".chat-btn").addEventListener("click", () => openChat(id));

    // Details button
    card.querySelector(".details-btn").addEventListener("click", () => showDetails(id));

    cropsContainer.appendChild(card);
    startCountdown(id, crop.datetime || crop.time);
  });

  updateWishlistCount();
}

// -------------------- DETAILS POPUP --------------------
function showDetails(id) {
  const crop = crops.find(c => getIdOf(c) === id);
  if (!crop) return;

  const popup = document.getElementById("detailsPopup");
  if (!popup) return;

  document.getElementById("cropName").innerText = getCropName(crop);
  document.getElementById("cropQuantity").innerText = crop.quantity ?? "-";
  document.getElementById("cropQuality").innerText = crop.quality || "-";
  document.getElementById("cropLocation").innerText = crop.location || "Unknown";
  document.getElementById("cropTime").innerText = new Date(crop.datetime || crop.time).toLocaleString();

  const statusEl = document.getElementById("biddingStatus");
  statusEl.innerHTML = isBiddingOpen(crop)
    ? "<span style='color:green;'>🟢 Bidding Open</span>"
    : "<span style='color:red;'>🔴 Bidding Closed</span>";

  popup.style.display = "block";
}

function closePopup() {
  const popup = document.getElementById("detailsPopup");
  if (popup) popup.style.display = "none";
}

// -------------------- COUNTDOWN --------------------
function startCountdown(id, dateTime) {
  const el = document.getElementById(`timer-${id}`);
  if (!dateTime || !el) return;

  const target = new Date(dateTime).getTime() + 3600000; // +1 hour
  if (isNaN(target)) {
    el.innerText = "";
    return;
  }

  const updateTimer = () => {
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) {
      el.innerText = "⏰ Bidding Closed";
      return;
    }
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    el.innerText = `Time Left: ${hrs}h ${mins}m ${secs}s`;
  };

  updateTimer();
  setInterval(updateTimer, 1000);
}

// -------------------- WISHLIST HANDLING --------------------
function toggleWishlist(crop) {
  if (!crop) return;
  const id = getIdOf(crop);
  const existingIndex = wishlist.findIndex(item => getIdOf(item) === id);

  if (existingIndex >= 0) {
    wishlist.splice(existingIndex, 1);
  } else {
    wishlist.push(crop);
  }

  localStorage.setItem("wishlist", JSON.stringify(wishlist));
  updateWishlistCount();
}

function updateWishlistCount() {
  if (wishlistCountEl) wishlistCountEl.textContent = wishlist.length;
}

// -------------------- CHAT --------------------
function openChat(cropId) {
  if (!currentUser || !currentUser.id) {
    alert("Please login first!");
    window.location.href = "/login";
    return;
  }
  localStorage.setItem("chatCropId", cropId);
  window.location.href = `/chat?crop_id=${cropId}`;
}

// -------------------- SEARCH & FILTER --------------------
function applyFilter() {
  const loc = (locationInput?.value.trim().toLowerCase()) || "";
  const search = (searchInput?.value.trim().toLowerCase()) || "";
  let filtered = crops.slice();

  filtered = filtered.filter(c => {
    const status = (c.status || "").toLowerCase();
    return status !== "closed" && status !== "sold" && isBiddingOpen(c);
  });

  if (loc) {
    filtered = filtered.filter(c => c.location && c.location.toLowerCase().includes(loc));
  }

  if (search) {
    filtered = filtered.filter(c => getCropName(c).toLowerCase().includes(search));
  }

  displayCrops(filtered);
}

// -------------------- INITIALIZATION --------------------
document.addEventListener("DOMContentLoaded", () => {
  cropsContainer =
    document.getElementById("crops-container") ||
    document.getElementById("cropContainer") ||
    document.getElementById("crop-container");

  noCropsMessage = document.getElementById("noCropsMessage");
  wishlistCountEl = document.getElementById("wishlist-count");
  searchInput = document.getElementById("search");
  filterBtn = document.getElementById("filterBtn");
  locationInput = document.getElementById("locationInput");

  try { wishlist = JSON.parse(localStorage.getItem("wishlist")) || []; } catch { wishlist = []; }
  try { currentUser = JSON.parse(localStorage.getItem("loggedInUser")) || {}; } catch { currentUser = {}; }

  if (filterBtn) filterBtn.addEventListener("click", applyFilter);
  if (searchInput) searchInput.addEventListener("input", applyFilter);
  if (locationInput) locationInput.addEventListener("keyup", e => { if (e.key === "Enter") applyFilter(); });

  if (!currentUser || !currentUser.id) {
    alert("Please login to view crops.");
    window.location.href = "/login";
    return;
  }

  updateWishlistCount();
  fetchCrops();
});
