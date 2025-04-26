/**
 * Grok Code Assistant JavaScript
 * Handles UI interactions for a Grok-like coding chatbot.
 */

// Globals
let sessionId = "{{ active_session_id }}";
const API_BASE = "/coder/api/";
const PROMPT_SUGGESTIONS = [
    "Write a Python function for binary search",
    "Debug a JavaScript Promise issue",
    "Explain CSS flexbox with an example",
    "Create a unit test for a Django view",
];

// Map language codes from coder/settings.py to Highlight.js language names
const LANGUAGE_MAP = {
    'python': 'python',
    'javascript': 'javascript',
    'htmlmixed': 'html', // Highlight.js uses 'html'
    'css': 'css',
    'clike': 'cpp', // Highlight.js uses 'cpp' for C-like languages
    'sql': 'sql',
    'shell': 'bash',
    'go': 'go',
    'rust': 'rust',
    'php': 'php',
    'ruby': 'ruby',
};

// On Load
document.addEventListener("DOMContentLoaded", () => {
    bindUI();
    listSessions();
    showPromptSuggestions();
    loadSession(sessionId);
});

// UI Binding
function bindUI() {
    const newSessionBtn = qs("#newSessionBtn");
    const promptForm = qs("#promptForm");
    const sessionSearch = qs("#sessionSearch");
    const toggleSidebarBtn = qs("#toggleSidebarBtn");

    newSessionBtn?.addEventListener("click", createSessionFromPrompt);
    promptForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        debounceSendPrompt();
    });
    sessionSearch?.addEventListener("input", filterSessions);
    toggleSidebarBtn?.addEventListener("click", () => {
        qs("#sidebarContainer")?.classList.toggle("transform");
    });
}

// Prompt Suggestions
function showPromptSuggestions() {
    const container = qs("#promptSuggestions");
    if (!container) return;
    container.innerHTML = PROMPT_SUGGESTIONS.map(
        (s) => `<button class="suggestion-btn" onclick="fillPrompt('${s}')">${s}</button>`
    ).join("");
}

function fillPrompt(text) {
    const promptInput = qs("#promptInput");
    if (promptInput) {
        promptInput.value = text;
        promptInput.focus();
    }
}

// Sessions List
async function listSessions() {
    const container = qs("#sessionsList");
    if (!container) return;
    container.innerHTML = '<div class="text-gray-300 text-center py-4">Loading your chats...</div>';
    try {
        const sessions = await apiGet("sessions/");
        if (!sessions.length) {
            container.innerHTML = '<div class="text-gray-300 text-center py-4">No chats yet</div>';
            return;
        }
        container.innerHTML = sessions.map((s) => `
            <div data-id="${s.id}" class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-indigo-900/30 truncate">
                <button class="load-session flex-1 truncate text-gray-100 text-left">${escapeHTML(s.title)}</button>
                <div class="flex items-center space-x-2">
                    <button class="edit-session text-gray-400 hover:text-white" title="Edit chat title"><i class="fas fa-edit"></i></button>
                    <button class="delete-session text-gray-400 hover:text-red-400" title="Delete chat"><i class="fas fa-trash"></i></button>
                    <small class="text-xs text-gray-400">${new Date(s.updated_at).toLocaleTimeString()}</small>
                </div>
            </div>
        `).join("");
        container.querySelectorAll("[data-id]").forEach((el) => {
            el.querySelector(".load-session").addEventListener("click", () => loadSession(el.dataset.id));
            el.querySelector(".delete-session").addEventListener("click", () => deleteSession(el.dataset.id));
            el.querySelector(".edit-session").addEventListener("click", () => editSession(el.dataset.id));
        });
    } catch (err) {
        container.innerHTML = `<div class="text-red-400 text-center py-4">Failed to load chats: ${escapeHTML(err.message)}</div>`;
    }
}

// Session Management
async function createSessionFromPrompt() {
    try {
        const result = await apiPost("sessions/", {
            title: "New Chat",
            description: "",
            is_active: true,
        });
        sessionId = result.id;
        qs("#currentSession").textContent = result.title;
        await listSessions();
        renderChat([]);
        appendStatus("New chat created!", "success");
    } catch (err) {
        appendStatus(`Error: ${err.message}`, "error");
    }
}

async function loadSession(id) {
    sessionId = id;
    try {
        const session = await apiGet(`sessions/${id}/`);
        qs("#currentSession").textContent = session.title;
        renderChat(session.interactions || []);
        appendStatus(`Loaded chat: ${session.title}`, "success");
    } catch (err) {
        appendStatus(`Error: ${err.message}`, "error");
    }
}

async function deleteSession(id) {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    try {
        await apiDelete(`sessions/${id}/delete_session/`);
        await listSessions();
        if (sessionId === id) {
            sessionId = null;
            qs("#currentSession").textContent = "Select or create a chat";
            renderChat([]);
        }
        appendStatus("Chat deleted", "success");
    } catch (err) {
        appendStatus(`Error: ${err.message}`, "error");
    }
}

async function editSession(id) {
    try {
        const session = await apiGet(`sessions/${id}/`);
        const sessionTitle = qs("#sessionTitle");
        const sessionDescription = qs("#sessionDescription");
        const sessionModal = qs("#sessionModal");
        if (!sessionTitle || !sessionDescription || !sessionModal) return;
        sessionTitle.value = session.title;
        sessionDescription.value = session.description || "";
        sessionModal.classList.remove("hidden");
        qs("#newSessionForm").onsubmit = async (e) => {
            e.preventDefault();
            try {
                await apiPatch(`sessions/${id}/update_session/`, {
                    title: sessionTitle.value,
                    description: sessionDescription.value,
                });
                sessionModal.classList.add("hidden");
                await listSessions();
                if (sessionId === id) {
                    qs("#currentSession").textContent = sessionTitle.value;
                }
                appendStatus("Chat updated", "success");
            } catch (err) {
                appendStatus(`Error: ${err.message}`, "error");
            }
        };
    } catch (err) {
        appendStatus(`Error: ${err.message}`, "error");
    }
}

function filterSessions() {
    const query = qs("#sessionSearch")?.value.toLowerCase() || "";
    document.querySelectorAll("#sessionsList [data-id]").forEach((el) => {
        const title = el.querySelector(".load-session").textContent.toLowerCase();
        el.style.display = title.includes(query) ? "" : "none";
    });
}

// Show Loading Indicator
function showLoading() {
    const loadingSpinner = qs("#loadingSpinner");
    if (loadingSpinner) {
        loadingSpinner.classList.add("active");
    }
}

// Hide Loading Indicator
function hideLoading() {
    const loadingSpinner = qs("#loadingSpinner");
    if (loadingSpinner) {
        loadingSpinner.classList.remove("active");
    }
}

// Send Prompt
const debounceSendPrompt = debounce(async () => {
    const promptInput = qs("#promptInput");
    const thinkMode = qs("#thinkMode")?.checked || false;
    if (!promptInput) {
        appendStatus("Error: Prompt input not found", "error");
        return;
    }
    const prompt = promptInput.value.trim();
    if (!prompt) {
        appendStatus("Please enter a question", "error");
        return;
    }
    if (!sessionId) {
        appendStatus("Creating a new chat...", "info");
        await createSessionFromPrompt();
        if (!sessionId) {
            appendStatus("Error: Failed to create chat", "error");
            return;
        }
    }
    const language = qs("#languageSelect")?.value || "python";
    appendChatMessage("user", prompt);
    disableInput();
    showLoading();
    try {
        const result = await apiPost("interactions/", {
            session_id: sessionId,
            prompt,
            language,
            think_mode: thinkMode,
        });
        // Simulate typing animation
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay for effect
        appendChatMessage("assistant", result.response, result.code_snippets);
        promptInput.value = "";
    } catch (err) {
        appendStatus(`Error: ${err.message}`, "error");
    } finally {
        hideLoading();
        enableInput();
        hljs.highlightAll();
    }
}, 300);

// Chat Rendering
function renderChat(interactions) {
    const chatArea = qs("#chatMessages");
    if (!chatArea) return;
    if (!interactions.length) {
        chatArea.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center p-6">
                <div class="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <i class="fas fa-robot text-3xl text-white"></i>
                </div>
                <h2 class="text-2xl font-semibold text-white mb-2">Hi, I'm Your Code Buddy!</h2>
                <p class="text-gray-300 max-w-md text-lg">Need help with coding? Ask me anything, from writing code to debugging issues. Let’s get started!</p>
                <div id="promptSuggestions" class="mt-6 flex flex-wrap gap-3 justify-center"></div>
            </div>
        `;
        showPromptSuggestions();
        return;
    }
    chatArea.innerHTML = interactions.map((i) => `
        <div class="chat-bubble ${i.prompt ? 'ml-auto user-bubble' : 'mr-auto assistant-bubble'}">
            ${i.prompt ? `<p class="mb-2"><strong>You:</strong> ${escapeHTML(i.prompt)}</p>` : ""}
            <div>${formatResponse(i.response, i.code_snippet ? [{ language: i.language, code: i.code_snippet }] : [])}</div>
        </div>
    `).join("");
    chatArea.scrollTop = chatArea.scrollHeight;
    hljs.highlightAll();
}

function appendChatMessage(role, content, codeSnippets = []) {
    const chatArea = qs("#chatMessages");
    if (!chatArea) return;
    const div = document.createElement("div");
    div.className = `chat-bubble ${role === "user" ? "ml-auto user-bubble" : "mr-auto assistant-bubble"}`;
    div.innerHTML = role === "user" ? `<p class="mb-2"><strong>You:</strong> ${escapeHTML(content)}</p>` : formatResponse(content, codeSnippets);
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
    hljs.highlightAll();
}

// API Helpers
async function apiGet(path) {
    const response = await fetch(API_BASE + path, {
        credentials: "same-origin",
        headers: { "Accept": "application/json" },
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

async function apiPost(path, data) {
    const response = await fetch(API_BASE + path, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRF(),
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

async function apiDelete(path) {
    const response = await fetch(API_BASE + path, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "X-CSRFToken": getCSRF() },
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
}

async function apiPatch(path, data) {
    const response = await fetch(API_BASE + path, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRF(),
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
}

function getCSRF() {
    return document.querySelector("[name=csrfmiddlewaretoken]")?.value || "";
}

function debounce(fn, ms) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    };
}

function appendStatus(message, type = "info") {
    const chatArea = qs("#chatMessages");
    if (!chatArea) return;
    const msgDiv = document.createElement("div");
    msgDiv.className = `p-4 rounded-lg shadow-md text-center ${
        type === "error" ? "bg-red-800 text-red-200" :
        type === "success" ? "bg-green-800 text-green-200" : "bg-gray-700 text-gray-200"
    }`;
    msgDiv.textContent = message;
    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function disableInput() {
    const promptInput = qs("#promptInput");
    const sendPromptBtn = qs("#sendPromptBtn");
    if (promptInput) promptInput.disabled = true;
    if (sendPromptBtn) sendPromptBtn.disabled = true;
}

function enableInput() {
    const promptInput = qs("#promptInput");
    const sendPromptBtn = qs("#sendPromptBtn");
    if (promptInput) promptInput.disabled = false;
    if (sendPromptBtn) sendPromptBtn.disabled = false;
    if (promptInput) promptInput.focus();
}

function escapeHTML(s, preserveWhitespace = false) {
    if (preserveWhitespace) {
        return s
            .replace(/&/g, "&")
            .replace(/</g, "<")
            .replace(/>/g, ">")
            .replace(/"/g, '"')
            .replace(/'/g, "'");
    }
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}

function formatResponse(text, codeSnippets) {
    let formatted = escapeHTML(text)
        .replace(/\n/g, "<br>")
        .replace(/`([^`]+)`/g, "<code class='bg-gray-700 px-1 rounded'>$1</code>");

    if (codeSnippets.length) {
        formatted += codeSnippets.map((snippet) => {
            const hljsLanguage = LANGUAGE_MAP[snippet.language] || snippet.language;
            return `
                <pre class="bg-gray-950 p-3 my-2 rounded-md overflow-x-auto text-sm border border-gray-700 relative" style="white-space: pre;">
                    <code class="language-${hljsLanguage}">${escapeHTML(snippet.code, true)}</code>
                    <button class="copy-code-btn absolute top-2 right-2 text-gray-400 hover:text-white" title="Copy code">
                        <i class="fas fa-copy"></i>
                    </button>
                </pre>
            `;
        }).join("");
    }
    return formatted;
}

function qs(sel) {
    return document.querySelector(sel);
}

document.addEventListener("click", (e) => {
    if (e.target.closest(".copy-code-btn")) {
        const code = e.target.closest("pre").querySelector("code").textContent;
        navigator.clipboard.writeText(code).then(() => {
            appendStatus("Code copied to clipboard!", "success");
        }).catch(() => {
            appendStatus("Failed to copy code", "error");
        });
    }
});