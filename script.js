(function () {
  "use strict";

  const CACHE_KEY = "chatbox_tags";
  const HISTORY_KEY = "chatbox_tag_history";
  const CHAT_CACHE_KEY = "chatbox_messages";
  const MAX_CHAT_MESSAGES = 200;
  const MAX_TAG_HISTORY = 500;

  const tagContainer = document.querySelector(".tag-container");
  const input = document.querySelector("#chatInput") || document.querySelector(".tag-container input");
  const btnRemoveAll = document.querySelector("#removeAll");
  const btnCopy = document.querySelector("#copy");
  const suggestionsEl = document.querySelector(".suggestions");
  const chatThread = document.getElementById("chatThread");

  let tags = [];
  let tagHistory = [];
  let messages = [];

function createTag(tag) {
  const div = document.createElement("div");
  div.className = "tag";
  const span = document.createElement("span");
  span.textContent = tag;
  const icon = document.createElement("ion-icon");
  icon.setAttribute("name", "close-circle-outline");
  icon.setAttribute("data-item", tag);
  div.appendChild(span);
  div.appendChild(icon);
  return div;
}

function reset() {
  const tagElements = document.querySelectorAll(".tag");
  tagElements.forEach((tag) => {
    tag.parentElement.removeChild(tag);
  });
}

// ——— User cache: load / save ———
function loadFromCache() {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    const history = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) tags = parsed;
    }
    if (history) {
      const parsed = JSON.parse(history);
      if (Array.isArray(parsed)) tagHistory = parsed;
    }
  } catch (e) {
    console.warn("Cache load failed", e);
  }
}

function saveToCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tags));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(tagHistory));
  } catch (e) {
    console.warn("Cache save failed", e);
  }
}

function addToHistory(tag) {
  const t = String(tag).trim();
  if (!t) return;
  if (tagHistory.includes(t)) return;
  tagHistory.push(t);
  if (tagHistory.length > MAX_TAG_HISTORY) tagHistory = tagHistory.slice(-MAX_TAG_HISTORY);
}

// ——— Auto-reply (box replies to user) ———
const AUTO_REPLIES = {
  greetings: [
    "Hi! Add tags or ask me anything — I'll remember them.",
    "Hey there! Type a tag and press Enter, or just say what you need.",
    "Hello! I'm here to help with your tags. What would you like to add?",
  ],
  thanks: [
    "You're welcome!",
    "Happy to help!",
    "Anytime!",
  ],
  bye: [
    "Bye! Your tags are saved. See you next time.",
    "Goodbye! Come back whenever you need.",
    "See you! Your list is safe here.",
  ],
  help: "I remember your tags and suggest them when you type. Add tags with Enter, use copy to copy all, or clear to remove everything. Ask me anything!",
  howAreYou: [
    "I'm doing great, thanks for asking! Ready to help with your tags.",
    "All good here! How can I help you today?",
  ],
  name: "I'm your Chatbox — I remember your tags and reply when you message me.",
  compliment: [
    "Thanks! Glad you like it.",
    "You're kind! Let me know if you need anything.",
  ],
  howManyTags: () => `You have ${tags.length} tag${tags.length === 1 ? "" : "s"} right now.`,
  showTags: () => tags.length ? `Your tags: ${tags.join(", ")}` : "You don't have any tags yet. Type something and press Enter to add one!",
  yes: ["Sure!", "Got it.", "Okay!"],
  no: ["No problem.", "Alright.", "Understood."],
  default: [
    "Noted! Add more tags anytime, or ask me for help.",
    "I've got that. Type tags and press Enter to add them.",
    "Got it! Say \"help\" if you want to know what I can do.",
  ],
};

function pick(arr) {
  return Array.isArray(arr) ? arr[Math.floor(Math.random() * arr.length)] : arr;
}

function getAutoReply(userText, addedTags) {
  const t = (userText || "").trim().toLowerCase();
  if (!t && !(addedTags && addedTags.length)) return "";

  // Greetings
  if (/^(hi|hey|hello|yo|hiya|howdy|sup|what'?s up|good morning|good afternoon|good evening)\b/.test(t)) {
    return pick(AUTO_REPLIES.greetings);
  }
  if (/\b(thanks|thank you|thx|ty|thnx)\b/.test(t)) return pick(AUTO_REPLIES.thanks);
  if (/\b(bye|goodbye|see ya|see you|later|goodnight|good night)\b/.test(t)) return pick(AUTO_REPLIES.bye);
  if (/\b(help|what can you do|how does this work)\b/.test(t)) return AUTO_REPLIES.help;

  // About the bot
  if (/\b(how are you|how r u|how're you)\b/.test(t)) return pick(AUTO_REPLIES.howAreYou);
  if (/\b(who are you|what are you|your name|what'?s your name)\b/.test(t)) return AUTO_REPLIES.name;

  // Tags info
  if (/\b(how many tags|tag count|how many do i have)\b/.test(t)) return AUTO_REPLIES.howManyTags();
  if (/\b(show my tags|list tags|my tags|what are my tags)\b/.test(t)) return AUTO_REPLIES.showTags();

  // Short replies
  if (/^(yes|yeah|yep|ok|okay|sure)\b/.test(t)) return pick(AUTO_REPLIES.yes);
  if (/^(no|nope|nah)\b/.test(t)) return pick(AUTO_REPLIES.no);
  if (/\b(nice|cool|great|awesome|love it|good)\b/.test(t)) return pick(AUTO_REPLIES.compliment);

  // Tag added
  if (addedTags && addedTags.length > 0) {
    const list = addedTags.length === 1 ? `"${addedTags[0]}"` : addedTags.map((x) => `"${x}"`).join(" and ");
    const total = tags.length;
    return total === addedTags.length
      ? `Got it! Added ${list}. You have ${total} tag${total === 1 ? "" : "s"} now.`
      : `Added ${list}. You now have ${total} tag${total === 1 ? "" : "s"} in total.`;
  }

  return pick(AUTO_REPLIES.default);
}

function createMessageEl(role, text) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  msg.textContent = text;
  msg.setAttribute("role", role === "user" ? "user" : "status");
  return msg;
}

function appendMessage(role, text) {
  if (!text || !chatThread) return;
  chatThread.appendChild(createMessageEl(role, text));
  chatThread.scrollTop = chatThread.scrollHeight;
  messages.push({ role, text });
  if (messages.length > MAX_CHAT_MESSAGES) messages = messages.slice(-MAX_CHAT_MESSAGES);
  try {
    localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.warn("Chat cache save failed", e);
  }
}

function loadChatFromCache() {
  try {
    const raw = localStorage.getItem(CHAT_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) messages = parsed;
    }
  } catch (e) {
    console.warn("Chat cache load failed", e);
  }
  if (chatThread && messages.length) {
    chatThread.innerHTML = "";
    messages.forEach((m) => chatThread.appendChild(createMessageEl(m.role, m.text)));
    chatThread.scrollTop = chatThread.scrollHeight;
  }
}

// Load cached tags and chat on start
loadFromCache();
loadChatFromCache();
if (tags.length && !tagHistory.length) tagHistory = [...tags];
if (tags.length) addTags();

if (btnRemoveAll) {
  btnRemoveAll.addEventListener("click", () => {
    tags = [];
    reset();
    saveToCache();
    appendMessage("bot", "All tags cleared. Your list is empty.");
  });
}

function addTags() {
  if (!tagContainer) return;
  reset();
  tags
    .slice()
    .reverse()
    .forEach((tag) => tagContainer.prepend(createTag(tag)));
}

function getSuggestions(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  return tagHistory.filter((t) => t.toLowerCase().includes(q) && !tags.includes(t)).slice(0, 6);
}

function showSuggestions(items) {
  if (!suggestionsEl) return;
  suggestionsEl.innerHTML = "";
  suggestionsEl.setAttribute("aria-hidden", "true");
  if (!items.length) return;
  suggestionsEl.setAttribute("aria-hidden", "false");
  items.forEach((text) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "suggestion-item";
    item.textContent = text;
    item.addEventListener("click", () => {
      tags.push(text);
      tags = [...new Set(tags)];
      addTags();
      saveToCache();
      input.value = "";
      showSuggestions([]);
      input.focus();
      appendMessage("user", text);
      const reply = getAutoReply(text, [text]);
      if (reply) setTimeout(() => appendMessage("bot", reply), 400);
    });
    suggestionsEl.appendChild(item);
  });
}

function handleSubmit() {
  const data = input.value.trim();
  if (!data) return;
  const addedTags = [];
  if (data.includes(",")) {
    const list = data.split(",").map((s) => s.trim()).filter(Boolean);
    list.forEach(addToHistory);
    tags.push(...list);
    addedTags.push(...list);
  } else {
    addToHistory(data);
    tags.push(data);
    addedTags.push(data);
  }
  tags = [...new Set(tags)];
  input.value = "";
  addTags();
  saveToCache();
  showSuggestions([]);
  appendMessage("user", data);
  const reply = getAutoReply(data, addedTags);
  if (reply) setTimeout(() => appendMessage("bot", reply), 400);
}

if (input) {
  input.addEventListener("input", () => showSuggestions(getSuggestions(input.value)));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") showSuggestions([]);
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  });
}

document.addEventListener("click", (e) => {
  if (e.target.tagName === "ION-ICON") {
    const data = e.target.getAttribute("data-item");
    if (data != null) {
      tags = tags.filter((tag) => tag !== data);
      addTags();
      saveToCache();
    }
    return;
  }
  if (suggestionsEl && suggestionsEl.children.length && !e.target.closest(".input-wrap")) {
    showSuggestions([]);
  }
});

function showCopyFeedback() {
  const toast = document.querySelector(".copy-toast");
  if (toast) {
    toast.removeAttribute("hidden");
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      toast.setAttribute("hidden", "");
    }, 1500);
  }
}

if (btnCopy) {
  btnCopy.addEventListener("click", () => {
    if (tags.length) {
      navigator.clipboard
        .writeText(tags.join(", "))
        .then(showCopyFeedback)
        .catch((err) => console.error("Copy failed", err));
    }
  });
}

})();
