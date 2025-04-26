from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.generic import TemplateView   # <-- add this
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import CodeSession, CodeInteraction
from .serializers import (
    CodeSessionSerializer,
    CodeInteractionSerializer,
    CodeSessionListSerializer,
)
from .services import OllamaService
from .settings import CODE_LANGUAGES
class CodeSessionViewSet(viewsets.ModelViewSet):
    serializer_class = CodeSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CodeSession.objects.filter(user=self.request.user)
    
    def list(self, request):
        queryset = self.get_queryset()
        serializer = CodeSessionListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CodeInteractionViewSet(viewsets.ModelViewSet):
    serializer_class = CodeInteractionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CodeInteraction.objects.filter(session__user=self.request.user)
    
    def create(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({"error": "session_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        session = get_object_or_404(CodeSession, id=session_id, user=request.user)
        
        prompt = request.data.get('prompt')
        language = request.data.get('language', 'python')
        
        # Create an instance of the Ollama service
        ollama_service = OllamaService()
        
        # System prompt to guide the model to provide code
        system_prompt = f"You are a helpful coding assistant. Provide code solutions in {language}. Focus on writing clean, efficient, and well-commented code."
        
        # Call the Ollama API
        try:
            result = ollama_service.generate(
                prompt=prompt,
                model="deepseek-coder",
                system=system_prompt
            )
            
            # Extract the response and any code snippet
            ai_response = result.get('response', '')
            
            # Simple code extraction logic - can be improved
            code_snippet = self.extract_code_snippet(ai_response, language)
            
            # Save the interaction
            interaction = CodeInteraction.objects.create(
                session=session,
                prompt=prompt,
                response=ai_response,
                code_snippet=code_snippet,
                language=language
            )
            
            serializer = self.get_serializer(interaction)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to communicate with Ollama: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    def extract_code_snippet(self, response, language):
        """
        Extract code snippet from response
        This is a simple implementation that can be improved
        """
        # Look for code blocks with triple backticks
        import re
        pattern = r"```(?:" + language + r")?\s*([\s\S]*?)```"
        matches = re.findall(pattern, response)
        
        if matches:
            return matches[0].strip()
        
        # If no code block found, return empty string
        return ""

@method_decorator(login_required, name='dispatch')
class CoderIndexView(TemplateView):
    template_name = 'coder/index.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['code_languages'] = CODE_LANGUAGES
        return context