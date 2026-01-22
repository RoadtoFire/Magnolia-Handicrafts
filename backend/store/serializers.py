from rest_framework import serializers
from .models import Product, Order, OrderItem

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'is_in_stock', 'image']

# NEW: Serializer for the Order Item
class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'price']

# NEW: Serializer for the Order (Handles the nested save)
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ['id', 'full_name', 'email', 'phone', 'address', 'city', 'total_amount', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items') # Extract items
        order = Order.objects.create(**validated_data) # Create Order
        
        # Create each OrderItem
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
            
        return order