from django.contrib import admin
from .models import Product, ProductImage, Order, OrderItem

# This lets you see items INSIDE the order page
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    raw_id_fields = ['product']


# This lets you manage a product's images from the product page
class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'is_in_stock')
    inlines = [ProductImageInline]

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'city', 'total_amount', 'created_at')
    inlines = [OrderItemInline] # Shows the items in the order
