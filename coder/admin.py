from django.contrib import admin
from .models import CodeSession, CodeInteraction

@admin.register(CodeSession)
class CodeSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'created_at', 'updated_at', 'is_active')
    list_filter = ('is_active', 'created_at', 'updated_at')
    search_fields = ('title', 'description', 'user__username')
    
@admin.register(CodeInteraction)
class CodeInteractionAdmin(admin.ModelAdmin):
    list_display = ('session', 'language', 'created_at')
    list_filter = ('language', 'created_at')
    search_fields = ('prompt', 'response', 'code_snippet')