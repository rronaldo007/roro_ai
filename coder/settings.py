import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-coder")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
CONTEXT_WINDOW = int(os.getenv("CONTEXT_WINDOW", 3))

# List of supported programming languages for the code assistant
CODE_LANGUAGES = [
    ('python', 'Python'),
    ('javascript', 'JavaScript'),
    ('htmlmixed', 'HTML'),
    ('css', 'CSS'),
    ('clike', 'C/C++/Java'),
    ('sql', 'SQL'),
    ('shell', 'Shell'),
    ('go', 'Go'),
    ('rust', 'Rust'),
    ('php', 'PHP'),
    ('ruby', 'Ruby'),
]