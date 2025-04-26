/**
 * Code Assistant JavaScript
 * Handles UI interactions for the Roro-AI Code Assistant, including session management,
 * prompt submission, and code execution.
 */

// Globals
let editor;
let sessionId = null;
const API_BASE = '/coder/api/';
const MODE_MAP = {
  python: 'python',
  javascript: 'javascript',
  htmlmixed: 'htmlmixed',
  css: 'css',
  clike: 'text/x-c++src', // Maps to C, C++, Java
  sql: 'sql',
  shell: 'shell',
  go: 'go',
  rust: 'rust',
  php: 'php',
  ruby: 'ruby',
};

// Prompt Suggestions
const PROMPT_SUGGESTIONS = [
  "Write a binary search algorithm in Python",
  "Create a REST API endpoint in JavaScript",
  "Generate a responsive CSS grid layout",
  "Write a unit test for a Python function",
];

// On Load
document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  bindUI();
  listSessions();
  showPromptSuggestions();
  disableInput();
});

// Initialize CodeMirror
function initEditor() {
  const codeEditor = document.getElementById('codeEditor');
  if (!codeEditor) {
    console.error('Code editor element not found');
    return;
  }
  editor = CodeMirror(codeEditor, {
    theme: 'dracula',
    lineNumbers: true,
    mode: 'python',
    matchBrackets: true,
    autoCloseBrackets: true,
    extraKeys: {
      'Ctrl-Enter': () => qs('#promptForm')?.dispatchEvent(new Event('submit')),
    },
  });
  editor.setSize('100%', '100%');
}

// UI Binding
function bindUI() {
  const newSessionBtn = qs('#newSessionBtn');
  const promptForm = qs('#promptForm');
  const copyCodeBtn = qs('#copyCodeBtn');
  const runCodeBtn = qs('#runCodeBtn');
  const languageSelect = qs('#languageSelect');
  const closeEditorBtn = qs('#closeEditorBtn');
  const sessionSearch = qs('#sessionSearch');
  const toggleSidebarBtn = qs('#toggleSidebarBtn');

  if (newSessionBtn) {
    newSessionBtn.addEventListener('click', createSessionFromPrompt);
  } else {
    console.warn('New session button not found');
  }
  if (promptForm) {
    promptForm.addEventListener('submit', (e) => {
      e.preventDefault();
      debounceSendPrompt();
    });
  } else {
    console.warn('Prompt form not found');
  }
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', copyCode);
  } else {
    console.warn('Copy code button not found');
  }
  if (runCodeBtn) {
    runCodeBtn.addEventListener('click', runCode);
  } else {
    console.warn('Run code button not found');
  }
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      editor.setOption('mode', MODE_MAP[e.target.value] || 'python');
    });
  } else {
    console.warn('Language select not found');
  }
  if (closeEditorBtn) {
    closeEditorBtn.addEventListener('click', () => {
      const panel = qs('#codeEditorPanel');
      if (panel) panel.style.width = '0';
    });
  } else {
    console.warn('Close editor button not found');
  }
  if (sessionSearch) {
    sessionSearch.addEventListener('input', filterSessions);
  } else {
    console.warn('Session search input not found');
  }
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      const sidebar = qs('#sidebarContainer');
      if (sidebar) sidebar.classList.toggle('transform');
    });
  } else {
    console.warn('Toggle sidebar button not found');
  }
}

// Prompt Suggestions
function showPromptSuggestions() {
  const container = qs('#promptSuggestions');
  if (!container) {
    console.warn('Prompt suggestions container not found');
    return;
  }
  container.innerHTML = PROMPT_SUGGESTIONS.map((s) => `
    <button class="text-gray-100 bg-gray-700 hover:bg-gray-600 rounded-lg p-2 text-sm suggestion-btn" onclick="fillPrompt('${s}')">${s}</button>
  `).join('');
}

function fillPrompt(text) {
  const promptInput = qs('#promptInput');
  if (promptInput) {
    promptInput.value = text;
    promptInput.focus();
  } else {
    console.warn('Prompt input not found');
  }
}

// Sessions List
async function listSessions() {
  const container = qs('#sessionsList');
  if (!container) {
    console.error('Sessions list container not found');
    return;
  }
  container.innerHTML = '<div class="text-gray-300 text-center py-4">Loading sessions...</div>';
  try {
    const sessions = await apiGet('sessions/');
    if (!sessions.length) {
      container.innerHTML = '<div class="text-gray-300 text-center py-4">No sessions yet</div>';
      enableInput();
      return;
    }
    container.innerHTML = sessions.map((s) => `
      <div data-id="${s.id}" class="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-indigo-900/30 truncate">
        <button class="load-session flex-1 truncate text-gray-100 text-left">${escapeHTML(s.title)}</button>
        <div class="flex items-center space-x-2">
          <button class="edit-session text-gray-400 hover:text-white" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="delete-session text-gray-400 hover:text-red-400" title="Delete"><i class="fas fa-trash"></i></button>
          <small class="text-xs text-gray-400">${new Date(s.updated_at).toLocaleTimeString()}</small>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('[data-id]').forEach((el) => {
      el.querySelector('.load-session').addEventListener('click', () => loadSession(el.dataset.id));
      el.querySelector('.delete-session').addEventListener('click', () => deleteSession(el.dataset.id));
      el.querySelector('.edit-session').addEventListener('click', () => editSession(el.dataset.id));
    });
    enableInput();
  } catch (err) {
    console.error('Failed to load sessions:', err);
    container.innerHTML = `<div class="text-red-400 text-center py-4">Failed to load sessions: ${escapeHTML(err.message)}</div>`;
    enableInput();
  }
}

// Session Management
async function createSessionFromPrompt() {
  try {
    const result = await apiPost('sessions/', {
      title: 'New Session',
      description: '',
      is_active: true,
    });
    sessionId = result.id;
    const currentSession = qs('#currentSession');
    if (currentSession) currentSession.textContent = result.title;
    await listSessions();
    appendStatus('Session created', 'success');
    enableInput();
  } catch (err) {
    console.error('Failed to create session:', err);
    appendStatus(`Error: ${err.message}`, 'error');
  }
}

async function loadSession(id) {
  sessionId = id;
  try {
    const session = await apiGet(`sessions/${id}/`);
    const currentSession = qs('#currentSession');
    if (currentSession) currentSession.textContent = session.title;
    renderChat(session.interactions || []);
    appendStatus(`Loaded session: ${session.title}`, 'success');
    enableInput();
  } catch (err) {
    console.error('Failed to load session:', err);
    appendStatus(`Error: ${err.message}`, 'error');
  }
}

async function deleteSession(id) {
  if (!confirm('Delete this session?')) return;
  try {
    await apiDelete(`sessions/${id}/delete_session/`);
    await listSessions();
    if (sessionId === id) {
      sessionId = null;
      const currentSession = qs('#currentSession');
      if (currentSession) currentSession.textContent = 'Select or create a session';
      renderChat([]);
    }
    appendStatus('Session deleted', 'success');
  } catch (err) {
    console.error('Failed to delete session:', err);
    appendStatus(`Error: ${err.message}`, 'error');
  }
}

async function editSession(id) {
  try {
    const session = await apiGet(`sessions/${id}/`);
    const sessionTitle = qs('#sessionTitle');
    const sessionDescription = qs('#sessionDescription');
    const sessionModal = qs('#sessionModal');
    if (!sessionTitle || !sessionDescription || !sessionModal) {
      console.warn('Session modal elements not found');
      return;
    }
    sessionTitle.value = session.title;
    sessionDescription.value = session.description || '';
    sessionModal.classList.remove('hidden');
    const newSessionForm = qs('#newSessionForm');
    if (newSessionForm) {
      newSessionForm.onsubmit = async (e) => {
        e.preventDefault();
        try {
          await apiPatch(`sessions/${id}/update_session/`, {
            title: sessionTitle.value,
            description: sessionDescription.value,
          });
          sessionModal.classList.add('hidden');
          await listSessions();
          if (sessionId === id) {
            const currentSession = qs('#currentSession');
            if (currentSession) currentSession.textContent = sessionTitle.value;
          }
          appendStatus('Session updated', 'success');
        } catch (err) {
          console.error('Failed to update session:', err);
          appendStatus(`Error: ${err.message}`, 'error');
        }
      };
    } else {
      console.warn('New session form not found');
    }
  } catch (err) {
    console.error('Failed to load session for editing:', err);
    appendStatus(`Error: ${err.message}`, 'error');
  }
}

function filterSessions() {
  const query = qs('#sessionSearch')?.value.toLowerCase() || '';
  document.querySelectorAll('#sessionsList [data-id]').forEach((el) => {
    const title = el.querySelector('.load-session').textContent.toLowerCase();
    el.style.display = title.includes(query) ? '' : 'none';
  });
}

// Send Prompt
const debounceSendPrompt = debounce(async () => {
  const promptInput = qs('#promptInput');
  if (!promptInput) {
    console.warn('Prompt input not found');
    appendStatus('Error: Prompt input not found', 'error');
    return;
  }
  const prompt = promptInput.value.trim();
  if (!prompt) {
    appendStatus('Prompt is required', 'error');
    return;
  }
  if (!sessionId) {
    appendStatus('Creating new session...', 'info');
    await createSessionFromPrompt();
    if (!sessionId) {
      appendStatus('Error: Failed to create session', 'error');
      return;
    }
  }
  const language = qs('#languageSelect')?.value || 'python';
  appendStatus(`Prompt: ${prompt}`);
  disableInput();
  try {
    const result = await apiPost('interactions/', {
      session_id: sessionId,
      prompt,
      language,
    });
    appendStatus('Response received', 'success');
    editor.setValue(result.code_snippet || result.response);
    const session = await apiGet(`sessions/${sessionId}/`);
    renderChat(session.interactions || []);
    promptInput.value = '';
  } catch (err) {
    console.error('Failed to send prompt:', err);
    appendStatus(`Error: ${err.message}`, 'error');
  } finally {
    enableInput();
  }
}, 300);

// Chat Rendering
function renderChat(interactions) {
  const chatArea = qs('#chatMessages');
  if (!chatArea) {
    console.warn('Chat messages area not found');
    return;
  }
  if (!interactions.length) {
    chatArea.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center p-6">
        <div class="w-16 h-16 bg-indigo-950 rounded-full flex items-center justify-center mb-4 neumorphic">
          <i class="fas fa-code text-2xl text-indigo-300"></i>
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">DeepSeek Code Assistant</h2>
        <p class="text-gray-300 max-w-md">Generate, debug, or learn coding with DeepSeek's powerful AI.</p>
        <div id="promptSuggestions" class="mt-4 flex flex-wrap gap-2"></div>
      </div>
    `;
    showPromptSuggestions();
    return;
  }
  chatArea.innerHTML = interactions.map((i) => `
    <div class="p-4 bg-gray-800 rounded-lg shadow-md">
      <p class="text-gray-100 mb-2"><strong>Prompt:</strong> ${escapeHTML(i.prompt)}</p>
      <div class="text-gray-200">${formatResponse(i.response)}</div>
    </div>
  `).join('');
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Run Code
async function runCode() {
  if (!editor) {
    console.warn('Editor not initialized');
    appendStatus('Error: Editor not initialized', 'error');
    return;
  }
  const code = editor.getValue();
  const language = qs('#languageSelect')?.value || 'python';
  appendStatus('Running code…');
  try {
    const result = await apiPost('run_code/', { code, language });
    appendStatus(`Output: ${escapeHTML(result.output)}`, 'success');
  } catch (err) {
    console.error('Failed to run code:', err);
    appendStatus(`Error: ${err.message}`, 'error');
  }
}

// Copy Code
function copyCode() {
  if (!editor) {
    console.warn('Editor not initialized');
    appendStatus('Error: Editor not initialized', 'error');
    return;
  }
  const code = editor.getValue();
  navigator.clipboard.writeText(code).then(() => {
    appendStatus('Code copied to clipboard', 'success');
  }).catch((err) => {
    console.error('Failed to copy code:', err);
    appendStatus('Failed to copy code', 'error');
  });
}

// API Helpers
async function apiGet(path) {
  try {
    const response = await fetch(API_BASE + path, {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  } catch (err) {
    console.error(`GET ${path} failed:`, err);
    throw err;
  }
}

async function apiPost(path, data) {
  try {
    const response = await fetch(API_BASE + path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRF(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  } catch (err) {
    console.error(`POST ${path} failed:`, err);
    throw err;
  }
}

async function apiDelete(path) {
  try {
    const response = await fetch(API_BASE + path, {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'X-CSRFToken': getCSRF() },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    console.error(`DELETE ${path} failed:`, err);
    throw err;
  }
}

async function apiPatch(path, data) {
  try {
    const response = await fetch(API_BASE + path, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRF(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  } catch (err) {
    console.error(`PATCH ${path} failed:`, err);
    throw err;
  }
}

// CSRF Token
function getCSRF() {
  const token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
  if (!token) {
    console.error('CSRF token not found. Ensure {% csrf_token %} is included in the template.');
  }
  return token || '';
}

// Utilities
function debounce(fn, ms) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

function appendStatus(message, type = 'info') {
  const chatArea = qs('#chatMessages');
  if (!chatArea) {
    console.warn('Chat messages area not found');
    return;
  }
  const msgDiv = document.createElement('div');
  msgDiv.className = `p-4 rounded-lg shadow-md ${
    type === 'error' ? 'bg-red-800 text-red-200' :
    type === 'success' ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-200'
  }`;
  msgDiv.textContent = message;
  chatArea.appendChild(msgDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function disableInput() {
  const promptInput = qs('#promptInput');
  const sendPromptBtn = qs('#sendPromptBtn');
  if (promptInput) promptInput.disabled = true;
  if (sendPromptBtn) sendPromptBtn.disabled = true;
}

function enableInput() {
  const promptInput = qs('#promptInput');
  const sendPromptBtn = qs('#sendPromptBtn');
  if (promptInput) promptInput.disabled = false;
  if (sendPromptBtn) sendPromptBtn.disabled = false;
  if (promptInput) promptInput.focus();
}

function escapeHTML(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatResponse(t) {
  return escapeHTML(t)
    .replace(/```([\s\S]*?)```/g, (_, c) => `
      <pre class="bg-gray-950 text-green-400 p-3 my-2 rounded-md overflow-x-auto text-sm border border-gray-700">
        <code>${escapeHTML(c)}</code>
      </pre>
    `)
    .replace(/\n/g, '<br>');
}

function qs(sel) {
  const element = document.querySelector(sel);
  if (!element) {
    console.warn(`Element not found: ${sel}`);
  }
  return element;
}