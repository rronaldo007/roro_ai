import requests
import json
from django.conf import settings
from . import settings as coder_settings

class OllamaService:
    """Service to interact with Ollama API"""
    
    def __init__(self, base_url=None):
        self.base_url = base_url or coder_settings.OLLAMA_BASE_URL
        self.api_url = f"{self.base_url}/api"
        self.timeout = coder_settings.OLLAMA_TIMEOUT
    
    def generate(self, prompt, model=None, system="", stream=False, options=None):
        """
        Generate a response from the Ollama API
        
        Args:
            prompt (str): The user prompt
            model (str): The model to use
            system (str): Optional system prompt
            stream (bool): Whether to stream the response
            options (dict): Additional options for the model
            
        Returns:
            dict: The response from the API
        """
        url = f"{self.api_url}/generate"
        
        # Use the default model if none is specified
        if model is None:
            model = coder_settings.OLLAMA_DEFAULT_MODEL
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": stream
        }
        
        if system:
            payload["system"] = system
            
        if options:
            payload["options"] = options
            
        try:
            response = requests.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            # Log the error and return a friendly message
            print(f"Error communicating with Ollama: {e}")
            return {
                "error": (
                    f"Failed to communicate with the Ollama API: {str(e)}. "
                    "Make sure Ollama is running."
                )
            }
