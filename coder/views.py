# coder/views.py
import re
import os
from django.http import JsonResponse
from django.conf import settings
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
        CodeSession.objects.filter(user=self.request.user, is_active=True).update(is_active=False)
        serializer.save(user=self.request.user, is_active=True)

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

class CodeInteractionViewSet(viewsets.ModelViewSet):
    serializer_class = CodeInteractionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CodeInteraction.objects.filter(session__user=self.request.user)

    def create(self, request):
        session_id = request.data.get('session_id')
        prompt = request.data.get('prompt')
        language = request.data.get('language', 'python')
        think_mode = request.data.get('think_mode', False)

        if not session_id:
            return Response({"error": "session_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not prompt:
            return Response({"error": "prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

        session = get_object_or_404(CodeSession, id=session_id, user=request.user)

        system_prompt = (
            "You are Grok, a witty and helpful coding assistant created by xAI. "
            "Provide clear, concise, and accurate answers with a touch of humor. "
            f"For coding tasks, generate clean, well-commented {language} code in markdown code blocks. "
            "Include brief explanations for complex logic and follow best practices. "
            "If the prompt is unclear, ask clarifying questions or suggest improvements."
        )
        if think_mode:
            system_prompt += (
                "\nThink step-by-step, explain your reasoning clearly, "
                "and provide a detailed solution with thorough comments."
            )

        recent_interactions = CodeInteraction.objects.filter(session=session).order_by('-created_at')[:3]
        context = "\n".join([f"User: {i.prompt}\nAssistant: {i.response}" for i in recent_interactions])

        ollama_service = OllamaService()
        try:
            result = ollama_service.generate(
                prompt=f"{context}\n\nUser: {prompt}",
                model=os.getenv("OLLAMA_MODEL", "deepseek-coder"),
                system=system_prompt,
                options={"temperature": 0.7 if not think_mode else 0.9, "max_tokens": 2000}
            )
            ai_response = result.get('response', '')
            code_snippets = self.extract_code_snippets(ai_response, language)

            formatted_code = []
            for snippet in code_snippets:
                if black and language == 'python' and snippet['code']:
                    try:
                        snippet['code'] = black.format_str(snippet['code'], mode=black.FileMode())
                    except Exception as e:
                        print(f"Code formatting failed: {e}")
                formatted_code.append(snippet)

            interaction = CodeInteraction.objects.create(
                session=session,
                prompt=prompt,
                response=ai_response,
                code_snippet=formatted_code[0]['code'] if formatted_code else '',
                language=language
            )

            serializer = self.get_serializer(interaction)
            return Response({
                **serializer.data,
                'code_snippets': formatted_code
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Oops, something went wrong with Ollama: {str(e)}. Please try again!"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    def extract_code_snippets(self, response, language):
        pattern = r"```(?:{lang})?\s*([\s\S]*?)```".format(lang=re.escape(language))
        matches = re.findall(pattern, response, re.IGNORECASE)
        snippets = [{"language": language, "code": match.strip()} for match in matches]
        inline_pattern = r"`([^`]+)`"
        inline_matches = re.findall(inline_pattern, response)
        snippets.extend([{"language": "text", "code": match.strip()} for match in inline_matches])
        return snippets if snippets else [{"language": language, "code": ""}]

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

class CodeAssistantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        session = CodeSession.objects.filter(user=request.user, is_active=True).first()
        if not session:
            session = CodeSession.objects.create(
                user=request.user,
                title="Coding Session",
                is_active=True
            )
        return render(request, 'coder/index.html', {
            'code_languages': CODE_LANGUAGES,
            'active_session_id': session.id
        })