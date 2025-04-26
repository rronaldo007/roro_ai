from django.conf import settings

# Ollama settings
OLLAMA_BASE_URL = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_DEFAULT_MODEL = getattr(settings, 'OLLAMA_DEFAULT_MODEL', 'deepseek-coder')
OLLAMA_TIMEOUT = getattr(settings, 'OLLAMA_TIMEOUT', 120)  # seconds

# Code editor settings
CODE_LANGUAGES = getattr(settings, 'CODE_LANGUAGES', [
    ('python', 'Python'),
    ('javascript', 'JavaScript'),
    ('typescript', 'TypeScript'),
    ('html', 'HTML'),
    ('css', 'CSS'),
    ('java', 'Java'),
    ('cpp', 'C++'),
    ('csharp', 'C#'),
    ('go', 'Go'),
    ('rust', 'Rust'),
    ('php', 'PHP'),
    ('ruby', 'Ruby'),
    ('swift', 'Swift'),
    ('kotlin', 'Kotlin'),
    ('sql', 'SQL'),
    ('bash', 'Bash'),
])