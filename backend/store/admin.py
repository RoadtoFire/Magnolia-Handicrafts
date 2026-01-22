from django.contrib import admin
from .models import Product, Order, OrderItem

# This lets you see items INSIDE the order page
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    raw_id_fields = ['product']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'is_in_stock')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'city', 'total_amount', 'created_at')
    inlines = [OrderItemInline] # Shows the items in the order