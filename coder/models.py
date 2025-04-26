# coder/models.py
from django.db import models
from django.contrib.auth.models import User

class CodeSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class CodeInteraction(models.Model):
    session = models.ForeignKey(CodeSession, on_delete=models.CASCADE, related_name="interactions")
    prompt = models.TextField()
    response = models.TextField()
    code_snippet = models.TextField(blank=True)
    language = models.CharField(max_length=50, default="python")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Interaction in {self.session.title}"