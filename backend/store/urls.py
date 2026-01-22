from django.urls import path
from . import views

# ✅ CORRECT
urlpatterns = [
    # 1. List of ALL products (Plural function)
    path('products/', views.get_products, name='get_products'), 
    
    # 2. Single product detail (Singular function)
    path('products/<int:pk>/', views.get_product, name='get_product'),
    path('orders/', views.create_order, name='create_order'),
]