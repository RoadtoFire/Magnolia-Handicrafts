from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Product
from .serializers import ProductSerializer, OrderSerializer
from django.shortcuts import get_object_or_404
from rest_framework import status

@api_view(['GET']) # This view only accepts GET requests
def get_products(request):
    products = Product.objects.all() # 1. Get data from DB
    serializer = ProductSerializer(products, many=True) # 2. Convert to JSON
    return Response(serializer.data) # 3. Send back to React


@api_view(['GET'])
def get_product(request, pk):
    product = get_object_or_404(Product, pk=pk)
    serializer = ProductSerializer(product)
    return Response(serializer.data)


@api_view(['POST'])
def create_order(request):
    serializer = OrderSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)