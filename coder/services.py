# coder/services.py
import ollama

class OllamaService:
    def generate(self, prompt, model, system, options):
        try:
            response = ollama.chat(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                options=options
            )
            return {"response": response["message"]["content"]}
        except Exception as e:
            raise Exception(f"Ollama error: {str(e)}")