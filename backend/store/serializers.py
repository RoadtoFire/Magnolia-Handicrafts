from decimal import Decimal

from rest_framework import serializers
from .models import Product, ProductImage, Order, OrderItem


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'sort_order']

    def get_image(self, obj):
        # Build an absolute URL so this works the same whether `image.url`
        # is a local `/media/...` relative path (FileSystemStorage) or an
        # already-absolute Cloudinary URL (MediaCloudinaryStorage).
        if not obj.image:
            return None
        request = self.context.get('request')
        url = obj.image.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'short_description', 'description', 'price', 'is_in_stock', 'images']

# NEW: Serializer for the Order Item
class OrderItemSerializer(serializers.ModelSerializer):
    # `product` stays a plain PK field (that's what checkout POSTs), but the
    # admin orders page needs the actual product name to display, not just
    # its id - added as a separate read-only field rather than nesting the
    # full ProductSerializer, since nothing here needs the product's price/
    # stock/images, just its name.
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['product', 'product_name', 'quantity', 'price']
        # `price` must NEVER be trusted from the client - it is always
        # snapshotted server-side from the Product's current price at the
        # time OrderSerializer.create() runs. See OrderSerializer.create().
        extra_kwargs = {'price': {'read_only': True}}


# NEW: Serializer for the Order (Handles the nested save)
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            'id', 'public_id', 'full_name', 'email', 'phone', 'address', 'city',
            'total_amount', 'status', 'payment_method', 'payment_status', 'items',
        ]
        extra_kwargs = {
            # total_amount is always computed server-side from the real
            # Product prices at order time - a client-supplied value here
            # would let anyone check out for an arbitrary amount.
            'total_amount': {'read_only': True},
            'public_id': {'read_only': True},
            'payment_status': {'read_only': True},
            # payment_method IS writable - checkout picks 'cod', 'safepay',
            # or 'easypaisa' up front - but it only selects the gateway, it
            # never carries a trusted amount.
            #
            # status IS writable (admin-only, via PATCH) - this is how the
            # admin dashboard steps an order through New -> Confirmed ->
            # Dispatched -> Delivered -> Review Received (or Cancelled). The
            # admin frontend only ever PATCHes {"status": "..."} on its own,
            # never alongside `items`, so ModelSerializer's default update()
            # never has to deal with the nested `items` field (which it
            # doesn't support writing to outside of the custom create()
            # below).
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        if not items_data:
            raise serializers.ValidationError({'items': 'Order must contain at least one item.'})

        payment_method = validated_data.get('payment_method', 'cod')

        order_items = []
        total = Decimal('0')
        for item_data in items_data:
            product = item_data['product']  # resolved to a Product instance by PrimaryKeyRelatedField
            quantity = item_data['quantity']
            if not product.is_in_stock:
                raise serializers.ValidationError(
                    {'items': f'"{product.name}" is currently out of stock.'}
                )
            if quantity < 1:
                raise serializers.ValidationError({'items': 'Quantity must be at least 1.'})

            # Snapshot the REAL price server-side - any price the client
            # sent in the request body was already stripped by the
            # read-only `price` field above and never reaches here.
            line_price = product.price
            total += line_price * quantity
            order_items.append((product, quantity, line_price))

        order = Order.objects.create(
            total_amount=total,
            status='confirmed' if payment_method == 'cod' else 'new',
            payment_status='unpaid' if payment_method == 'cod' else 'pending',
            **{k: v for k, v in validated_data.items() if k != 'items'},
        )
        for product, quantity, price in order_items:
            OrderItem.objects.create(order=order, product=product, quantity=quantity, price=price)

        return order
