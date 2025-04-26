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
        fields = ['id', 'title', 'description', 'created_at', 'updated_at', 'is_active', 'interactions']
        
class CodeSessionListSerializer(serializers.ModelSerializer):
    interaction_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CodeSession
        fields = ['id', 'title', 'description', 'created_at', 'updated_at', 'is_active', 'interaction_count']
    
    def get_interaction_count(self, obj):
        return obj.interactions.count()