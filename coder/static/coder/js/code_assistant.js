// Global variables
let codeEditor;
let currentSessionId = null;
const API_BASE_URL = '/coder/api';

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize CodeMirror
    initializeCodeEditor();
    
    // Load the list of sessions
    loadSessions();
    
    // Set up event listeners
    setupEventListeners();
});

function initializeCodeEditor() {
    codeEditor = CodeMirror(document.getElementById('codeEditor'), {
        mode: 'python',
        theme: 'dracula',
        lineNumbers: true,
        indentUnit: 4,
        smartIndent: true,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: true,
        readOnly: false
    });
    
    // Adjust editor size
    codeEditor.setSize('100%', '100%');
    
    // Language selection handler
    document.getElementById('languageSelect').addEventListener('change', function(e) {
        const language = e.target.value;
        setEditorLanguage(language);
    });
}

function setEditorLanguage(language) {
    // Map language value to CodeMirror mode
    const modeMap = {
        'python': 'python',
        'javascript': 'javascript',
        'typescript': 'javascript',
        'html': 'htmlmixed',
        'css': 'css',
        'java': 'text/x-java',
        'cpp': 'text/x-c++src',
        'csharp': 'text/x-csharp',
        'go': 'text/x-go',
        'rust': 'text/x-rustsrc',
        'php': 'php',
        'ruby': 'ruby',
        'swift': 'swift',
        'kotlin': 'text/x-kotlin',
        'sql': 'sql',
        'bash': 'shell'
    };
    
    const mode = modeMap[language] || 'javascript';
    codeEditor.setOption('mode', mode);
}

function setupEventListeners() {
    // New session button
    document.getElementById('newSessionBtn').addEventListener('click', function() {
        document.getElementById('sessionModal').classList.remove('hidden');
    });
    
    // Cancel session button
    document.getElementById('cancelSessionBtn').addEventListener('click', function() {
        document.getElementById('sessionModal').classList.add('hidden');
    });
    
    // New session form
    document.getElementById('newSessionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createNewSession();
    });
    
    // Prompt form
    document.getElementById('promptForm').addEventListener('submit', function(e) {
        e.preventDefault();
        sendPrompt();
    });
    
    // Copy code button
    document.getElementById('copyCodeBtn').addEventListener('click', function() {
        copyCode();
    });
}

async function loadSessions() {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const sessions = await response.json();
        displaySessions(sessions);
    } catch (error) {
        console.error('Error loading sessions:', error);
        document.getElementById('sessionsList').innerHTML = `
            <div class="text-red-500 text-center py-4">
                Failed to load sessions. Please try again.
            </div>
        `;
    }
}

function displaySessions(sessions) {
    const sessionsList = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
        sessionsList.innerHTML = `
            <div class="text-gray-500 text-center py-4">
                No sessions yet. Create a new one to get started.
            </div>
        `;
        return;
    }
    
    const sessionsHTML = sessions.map(session => `
        <div class="session-item p-2 hover:bg-gray-100 rounded cursor-pointer ${currentSessionId === session.id ? 'bg-blue-100' : ''}"
             data-session-id="${session.id}">
            <div class="font-medium">${session.title}</div>
            <div class="text-sm text-gray-500">${formatDate(session.updated_at)}</div>
        </div>
    `).join('');
    
    sessionsList.innerHTML = sessionsHTML;
    
    // Add click event listeners to session items
    document.querySelectorAll('.session-item').forEach(item => {
        item.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-session-id');
            loadSession(sessionId);
        });
    });
}

async function createNewSession() {
    const title = document.getElementById('sessionTitle').value.trim();
    const description = document.getElementById('sessionDescription').value.trim();
    
    if (!title) {
        alert('Please enter a title for your session');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({
                title,
                description,
                is_active: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const session = await response.json();
        document.getElementById('sessionModal').classList.add('hidden');
        document.getElementById('newSessionForm').reset();
        loadSessions();
        loadSession(session.id);
    } catch (error) {
        console.error('Error creating session:', error);
        alert('Failed to create session. Please try again.');
    }
}

async function loadSession(sessionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const session = await response.json();
        currentSessionId = session.id;
        
        // Update UI to show current session
        document.getElementById('currentSession').innerHTML = `
            <h2 class="text-2xl font-bold">${session.title}</h2>
            <div class="text-sm text-gray-500">
                Created ${formatDate(session.created_at)}
            </div>
        `;
        
        // Enable prompt input
        document.getElementById('promptInput').disabled = false;
        document.getElementById('sendPromptBtn').disabled = false;
        
        // Load interactions
        displayInteractions(session.interactions);
        
        // Update session list selection
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.remove('bg-blue-100');
            if (item.getAttribute('data-session-id') == sessionId) {
                item.classList.add('bg-blue-100');
            }
        });
    } catch (error) {
        console.error('Error loading session:', error);
        alert('Failed to load session. Please try again.');
    }
}

function displayInteractions(interactions) {
    const chatMessages = document.getElementById('chatMessages');
    
    if (interactions.length === 0) {
        chatMessages.innerHTML = `
            <div class="text-center py-10 text-gray-500">
                No interactions yet. Ask a question to get started.
            </div>
        `;
        return;
    }
    
    const messagesHTML = interactions.map(interaction => `
        <div class="mb-4">
            <div class="flex items-start mb-2">
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <i class="fas fa-user text-blue-500"></i>
                </div>
                <div class="bg-blue-100 rounded-lg p-3 max-w-[85%]">
                    <div class="text-sm font-medium">You</div>
                    <div>${sanitizeHtml(interaction.prompt)}</div>
                </div>
            </div>
            <div class="flex items-start">
                <div class="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                    <i class="fas fa-robot text-purple-500"></i>
                </div>
                <div class="bg-purple-100 rounded-lg p-3 max-w-[85%]">
                    <div class="text-sm font-medium">DeepSeek-Coder</div>
                    <div>${formatResponse(interaction.response)}</div>
                </div>
            </div>
            <div class="text-xs text-gray-500 text-right mt-1">
                ${formatDate(interaction.created_at)}
            </div>
        </div>
    `).join('');
    
    chatMessages.innerHTML = messagesHTML;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // If there's code in the last interaction, display it in the editor
    if (interactions.length > 0) {
        const lastInteraction = interactions[interactions.length - 1];
        if (lastInteraction.code_snippet) {
            codeEditor.setValue(lastInteraction.code_snippet);
            setEditorLanguage(lastInteraction.language);
            document.getElementById('languageSelect').value = lastInteraction.language;
        }
    }
}

async function sendPrompt() {
    const promptInput = document.getElementById('promptInput');
    const prompt = promptInput.value.trim();
    
    if (!prompt) {
        alert('Please enter a prompt');
        return;
    }
    
    if (!currentSessionId) {
        alert('Please select or create a session first');
        return;
    }
    
    const language = document.getElementById('languageSelect').value;
    
    // Disable input while processing
    promptInput.disabled = true;
    document.getElementById('sendPromptBtn').disabled = true;
    
    // Show loading indicator
    const chatMessages = document.getElementById('chatMessages');
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'text-center py-4 text-gray-500';
    loadingMessage.innerHTML = 'Getting response from DeepSeek-Coder...';
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        const response = await fetch(`${API_BASE_URL}/interactions/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({
                session_id: currentSessionId,
                prompt,
                language
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const interaction = await response.json();
        
        // Remove loading message
        chatMessages.removeChild(loadingMessage);
        
        // Reload session to display new interaction
        loadSession(currentSessionId);
        
        // Clear input
        promptInput.value = '';
    } catch (error) {
        console.error('Error sending prompt:', error);
        alert('Failed to send prompt. Please try again.');
        
        // Remove loading message
        chatMessages.removeChild(loadingMessage);
    } finally {
        // Re-enable input
        promptInput.disabled = false;
        document.getElementById('sendPromptBtn').disabled = false;
    }
}

function copyCode() {
    const code = codeEditor.getValue();
    
    if (!code) {
        alert('No code to copy');
        return;
    }
    
    navigator.clipboard.writeText(code)
        .then(() => {
            alert('Code copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy code:', err);
            alert('Failed to copy code. Please try again.');
        });
}

// Helper functions
function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function sanitizeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatResponse(text) {
    // Replace code blocks with styled code blocks
    let formatted = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre class="bg-gray-800 text-white p-2 rounded my-2 overflow-x-auto"><code>${sanitizeHtml(code)}</code></pre>`;
    });
    
    // Replace newlines with line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}