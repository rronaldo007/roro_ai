from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CodeSessionViewSet, CodeInteractionViewSet, CoderIndexView

router = DefaultRouter()
router.register(r'sessions', CodeSessionViewSet, basename='code-session')
router.register(r'interactions', CodeInteractionViewSet, basename='code-interaction')

app_name = 'coder'

urlpatterns = [
    path('', CoderIndexView.as_view(), name='index'),
    path('api/', include(router.urls)),
]