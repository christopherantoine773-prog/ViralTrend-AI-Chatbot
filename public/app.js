const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesEl = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const toast = document.getElementById("toast");
const sidebar = document.getElementById("sidebar");
const historyList = document.getElementById("historyList");

let messages = [];
let isSending = false;
let history = [];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3200);
}
function saveHistory() {
  if (!messages.length) return;
  const title = (messages.find(m => m.role === "user")?.content || "Discussion").slice(0, 42);
  const entry = { title, messages: messages.slice() };
  history = [entry, ...history.filter(h => h.title !== title)].slice(0, 8);
  try { localStorage.setItem("viraltrend-chat-history", JSON.stringify(history)); } catch {}
  renderHistory();
}
function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem("viraltrend-chat-history") || "[]");
    if (Array.isArray(saved)) history = saved.slice(0, 8);
  } catch { history = []; }
  renderHistory();
}
function renderHistory() {
  historyList.innerHTML = "";
  history.forEach((entry, index) => {
    const btn = document.createElement("button");
    btn.className = "history-item";
    btn.textContent = entry.title;
    btn.title = entry.title;
    btn.addEventListener("click", () => {
      messages = entry.messages.slice();
      renderMessages();
      sidebar.classList.remove("open");
    });
    historyList.appendChild(btn);
  });
}
function addMessage(role, content, typing = false) {
  const row = document.createElement("div");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "T" : "✦";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (typing) {
    bubble.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
    row.dataset.typing = "true";
  } else {
    bubble.textContent = content;
  }
  row.append(avatar, bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollIntoView({ behavior: "smooth", block: "end" });
  return row;
}
function renderMessages() {
  messagesEl.innerHTML = "";
  welcome.style.display = messages.length ? "none" : "";
  messages.forEach(m => addMessage(m.role, m.content));
}
function startNewChat() {
  if (messages.length) saveHistory();
  messages = [];
  messagesEl.innerHTML = "";
  welcome.style.display = "";
  input.value = "";
  input.focus();
  sidebar.classList.remove("open");
}
async function sendMessage(text) {
  const content = (text || "").trim();
  if (!content || isSending) return;
  isSending = true;
  sendBtn.disabled = true;
  welcome.style.display = "none";
  messages.push({ role: "user", content });
  addMessage("user", content);
  input.value = "";
  resizeInput();
  const typingRow = addMessage("assistant", "", true);
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "La réponse a échoué.");
    typingRow.remove();
    messages.push({ role: "assistant", content: data.answer });
    addMessage("assistant", data.answer);
    saveHistory();
  } catch (error) {
    typingRow.remove();
    const message = error.message || "Erreur de connexion. Réessaie.";
    addMessage("assistant", message);
    showToast(message);
    // Keep only the user's actual message in the model history when the request fails.
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    input.focus();
  }
}
function resizeInput() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
}
form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});
input.addEventListener("input", resizeInput);
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
document.getElementById("newChat").addEventListener("click", startNewChat);
document.getElementById("clearBtn").addEventListener("click", () => {
  if (messages.length) saveHistory();
  messages = [];
  renderMessages();
  showToast("Conversation effacée.");
});
document.getElementById("menuBtn").addEventListener("click", () => sidebar.classList.toggle("open"));
document.getElementById("historyBtn").addEventListener("click", () => {
  historyList.scrollIntoView({ behavior: "smooth", block: "nearest" });
  sidebar.classList.remove("open");
});
document.querySelectorAll(".suggestion").forEach(btn => {
  btn.addEventListener("click", () => sendMessage(btn.dataset.prompt));
});
loadHistory();
