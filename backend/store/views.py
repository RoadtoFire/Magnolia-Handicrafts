from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .models import Order, Product, ProductImage
from .serializers import ProductImageSerializer, ProductSerializer, OrderSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    Preserves the original function-view URL shape:
      GET/POST   /api/products/
      GET/PUT/PATCH/DELETE /api/products/<pk>/
    plus an admin-only image upload action:
      POST /api/products/<pk>/images/
    """
    queryset = Product.objects.all().prefetch_related('images')
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]

    @action(
        detail=True,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[IsAdminUser],
        url_path='images',
    )
    def upload_images(self, request, pk=None):
        """
        Accepts one or more files under the `images` field
        (multipart/form-data, repeated `images` keys) and creates a
        ProductImage row for each. Also accepts a single file under
        `image` for convenience.
        """
        product = self.get_object()
        files = request.FILES.getlist('images') or request.FILES.getlist('image')
        if not files:
            return Response(
                {'detail': "No files provided. Send one or more files under the 'images' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        current_max = product.images.count()
        for offset, f in enumerate(files):
            created.append(
                ProductImage.objects.create(
                    product=product,
                    image=f,
                    sort_order=current_max + offset,
                )
            )

        serializer = ProductImageSerializer(created, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProductImageViewSet(
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Admin-only management of individual product images, e.g. reordering
    (PATCH sort_order/alt_text) or removing one:
      PATCH/PUT /api/product-images/<pk>/
      DELETE    /api/product-images/<pk>/
    """
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminUser]


class OrderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    Preserves the original URL shape, plus PATCH for the admin fulfillment
    stepper (New -> Confirmed -> Dispatched -> Delivered -> Review Received,
    or Cancelled):
      POST  /api/orders/         (public - customer checkout)
      GET   /api/orders/         (admin only - order management)
      GET   /api/orders/<pk>/    (admin only)
      PATCH /api/orders/<pk>/    (admin only - update status)
    """
    queryset = Order.objects.all().prefetch_related('items').order_by('-created_at')
    serializer_class = OrderSerializer
    throttle_scope = 'orders'

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminUser()]
