# coder/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views


app_name = 'coder'
router = DefaultRouter()
router.register(r'sessions', views.CodeSessionViewSet, basename='session')
router.register(r'interactions', views.CodeInteractionViewSet, basename='interaction')

urlpatterns = [
    path('', views.CodeAssistantView.as_view(), name='code_assistant'),
    path('api/run_code/', views.CodeExecutionView.as_view(), name='run_code'),
    path('api/format_code/', views.CodeFormattingView.as_view(), name='format_code'),
    path('api/', include(router.urls)),
]