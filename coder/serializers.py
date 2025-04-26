# coder/serializers.py
from rest_framework import serializers
from .models import CodeSession, CodeInteraction

class CodeInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeInteraction
        fields = ['id', 'prompt', 'response', 'code_snippet', 'language', 'created_at']

class CodeSessionSerializer(serializers.ModelSerializer):
    interactions = CodeInteractionSerializer(many=True, read_only=True)

    class Meta:
        model = CodeSession
        fields = ['id', 'title', 'description', 'is_active', 'created_at', 'updated_at', 'interactions']

class CodeSessionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeSession
        fields = ['id', 'title', 'description', 'is_active', 'created_at', 'updated_at']