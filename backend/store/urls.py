from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from . import auth_views

router = DefaultRouter()
router.register('products', views.ProductViewSet, basename='product')
router.register('product-images', views.ProductImageViewSet, basename='product-image')
router.register('orders', views.OrderViewSet, basename='order')

urlpatterns = [
    path('auth/login/', auth_views.login_view, name='auth-login'),
    path('auth/refresh/', auth_views.refresh_view, name='auth-refresh'),
    path('auth/logout/', auth_views.logout_view, name='auth-logout'),
    path('auth/me/', auth_views.me_view, name='auth-me'),
    path('', include(router.urls)),
]
