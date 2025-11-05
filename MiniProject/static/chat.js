// chat.js — Handles real-time chat between farmer & winning bidder

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");

const currentUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
const cropId = new URLSearchParams(window.location.search).get("crop_id");

// Validate
if (!currentUser || !currentUser.id) {
  alert("Please login to access chat.");
  window.location.href = "/login";
}

// Load messages periodically
async function loadMessages() {
  try {
    const res = await fetch(`/api/messages/${cropId}`);
    const data = await res.json();
    renderMessages(data);
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

// Render chat messages
function renderMessages(messages) {
  chatBox.innerHTML = "";

  if (!messages || messages.length === 0) {
    chatBox.innerHTML = "<p style='text-align:center;color:gray;'>No messages yet...</p>";
    return;
  }

  messages.forEach(msg => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${msg.sender_id === currentUser.id ? "self" : "other"}`;
    msgDiv.innerHTML = `
      <div>${msg.message}</div>
      <div class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</div>
    `;
    chatBox.appendChild(msgDiv);
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send new message
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  try {
    const res = await fetch("/api/send_message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crop_id: cropId,
        sender_id: currentUser.id,
        message: text
      })
    });

    if (!res.ok) throw new Error("Failed to send message");

    messageInput.value = "";
    await loadMessages();
  } catch (err) {
    alert("Error sending message: " + err.message);
  }
}

// Go back
function goBack() {
  window.history.back();
}

// Auto-refresh messages every 2 seconds
setInterval(loadMessages, 2000);
loadMessages();
