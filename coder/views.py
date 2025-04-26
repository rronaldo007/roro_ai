import re
from django.http import JsonResponse
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404, render
import subprocess
try:
    import black
except ImportError:
    black = None
from .models import CodeSession, CodeInteraction
from .serializers import CodeSessionSerializer, CodeInteractionSerializer, CodeSessionListSerializer
from .services import OllamaService
from .settings import CODE_LANGUAGES

# Existing ViewSets and Views (unchanged)
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

        system_prompt = (
            f"You are an expert coding assistant powered by DeepSeek. "
            f"Provide clean, efficient, and well-commented code in {language}. "
            f"Include explanations for complex logic and ensure code follows best practices. "
            f"If the prompt is ambiguous, ask clarifying questions or suggest improvements."
        )

        ollama_service = OllamaService()
        try:
            result = ollama_service.generate(
                prompt=prompt,
                model="deepseek-coder",
                system=system_prompt,
                options={"temperature": 0.7, "max_tokens": 2000}
            )
            ai_response = result.get('response', '')
            code_snippet = self.extract_code_snippet(ai_response, language)

            if black and language == 'python' and code_snippet:
                try:
                    code_snippet = black.format_str(code_snippet, mode=black.FileMode())
                except Exception as e:
                    print(f"Code formatting failed: {e}")

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
        pattern = r"```(?:{lang})?\s*([\s\S]*?)```".format(lang=re.escape(language))
        matches = re.findall(pattern, response, re.IGNORECASE)
        if matches:
            return matches[0].strip()

        inline_pattern = r"`([^`]+)`"
        inline_matches = re.findall(inline_pattern, response)
        if inline_matches:
            return inline_matches[0].strip()

        code_keywords = ['def ', 'function ', 'class ', 'import ', 'export ', 'const ', 'let ', 'var ']
        if any(keyword in response.lower() for keyword in code_keywords):
            lines = response.split('\n')
            code_lines = [line for line in lines if not line.strip().startswith(('#', '//', '/*', '*', '"""'))]
            return '\n'.join(code_lines).strip()

        return ""

    @action(detail=True, methods=['delete'])
    def delete_session(self, request, pk=None):
        session = get_object_or_404(CodeSession, id=pk, user=request.user)
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'])
    def update_session(self, request, pk=None):
        session = get_object_or_404(CodeSession, id=pk, user=request.user)
        serializer = CodeSessionSerializer(session, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CodeExecutionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        language = request.data.get('language', 'python')

        if language != 'python':
            return Response({"error": "Only Python execution is supported currently"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = subprocess.run(
                ['python', '-c', code],
                capture_output=True,
                text=True,
                timeout=5
            )
            output = result.stdout if result.stdout else result.stderr
            return Response({"output": output})
        except subprocess.TimeoutExpired:
            return Response({"error": "Code execution timed out"}, status=status.HTTP_408_REQUEST_TIMEOUT)
        except Exception as e:
            return Response({"error": f"Execution failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CodeFormattingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        language = request.data.get('language', 'python')

        if language != 'python':
            return Response({"error": "Only Python formatting is supported currently"}, status=status.HTTP_400_BAD_REQUEST)

        if not black:
            return Response({"error": "Code formatting is not available (black not installed)"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            formatted_code = black.format_str(code, mode=black.FileMode())
            return Response({"formatted_code": formatted_code})
        except Exception as e:
            return Response({"error": f"Formatting failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

# New View for Code Assistant Page
class CodeAssistantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return render(request, 'coder/index.html')