from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'coder'

router = DefaultRouter()
router.register(r'sessions', views.CodeSessionViewSet, basename='sessions')
router.register(r'interactions', views.CodeInteractionViewSet, basename='interactions')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/run_code/', views.CodeExecutionView.as_view(), name='run_code'),
    path('', views.CodeAssistantView.as_view(), name='index'),
]