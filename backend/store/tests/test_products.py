import io

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from store.models import Product, ProductImage

User = get_user_model()


def _png_bytes():
    buf = io.BytesIO()
    Image.new('RGB', (1, 1), color='red').save(buf, format='PNG')
    buf.seek(0)
    return buf.read()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(username='staffuser', password='pass12345', is_staff=True)


@pytest.fixture
def admin_client(api_client, staff_user):
    """An APIClient carrying a valid access_token cookie for a staff user."""
    access = RefreshToken.for_user(staff_user).access_token
    api_client.cookies['access_token'] = str(access)
    return api_client


@pytest.mark.django_db
def test_anonymous_can_list_products(api_client):
    Product.objects.create(name='Vase', description='A vase', price='10.00')
    resp = api_client.get('/api/products/')
    assert resp.status_code == 200
    assert len(resp.data) == 1


@pytest.mark.django_db
def test_anonymous_can_retrieve_product(api_client):
    product = Product.objects.create(name='Vase', description='A vase', price='10.00')
    resp = api_client.get(f'/api/products/{product.id}/')
    assert resp.status_code == 200
    assert resp.data['name'] == 'Vase'
    assert resp.data['images'] == []


@pytest.mark.django_db
def test_anonymous_cannot_create_product(api_client):
    # Note: DRF returns 401 (not 403) here because CookieJWTAuthentication
    # provides a real WWW-Authenticate challenge - see the comment on
    # CookieJWTAuthentication.authenticate_header() in store/authentication.py
    # for why 401 ("not authenticated") is the correct/idiomatic code rather
    # than 403 ("authenticated but forbidden").
    resp = api_client.post(
        '/api/products/',
        {'name': 'Mug', 'description': '', 'price': '5.00', 'is_in_stock': True},
        format='json',
    )
    assert resp.status_code == 401


@pytest.mark.django_db
def test_anonymous_cannot_update_or_delete_product(api_client):
    product = Product.objects.create(name='Vase', description='', price='10.00')

    resp = api_client.patch(f'/api/products/{product.id}/', {'name': 'New name'}, format='json')
    assert resp.status_code == 401

    resp = api_client.delete(f'/api/products/{product.id}/')
    assert resp.status_code == 401

    product.refresh_from_db()
    assert product.name == 'Vase'


@pytest.mark.django_db
def test_admin_can_create_update_delete_product(admin_client):
    resp = admin_client.post(
        '/api/products/',
        {'name': 'Mug', 'description': 'A mug', 'price': '5.00', 'is_in_stock': True},
        format='json',
    )
    assert resp.status_code == 201
    product_id = resp.data['id']

    resp = admin_client.patch(f'/api/products/{product_id}/', {'name': 'Big Mug'}, format='json')
    assert resp.status_code == 200
    assert resp.data['name'] == 'Big Mug'

    resp = admin_client.delete(f'/api/products/{product_id}/')
    assert resp.status_code == 204
    assert not Product.objects.filter(id=product_id).exists()


@pytest.mark.django_db
def test_admin_image_upload_creates_product_image_and_shows_in_serializer(admin_client):
    product = Product.objects.create(name='Bowl', description='', price='3.00')

    upload = SimpleUploadedFile('test.png', _png_bytes(), content_type='image/png')
    resp = admin_client.post(
        f'/api/products/{product.id}/images/',
        {'images': upload},
        format='multipart',
    )
    assert resp.status_code == 201
    assert ProductImage.objects.filter(product=product).count() == 1

    detail = admin_client.get(f'/api/products/{product.id}/')
    assert detail.status_code == 200
    assert len(detail.data['images']) == 1
    assert detail.data['images'][0]['image']  # non-empty absolute URL


@pytest.mark.django_db
def test_anonymous_cannot_upload_product_image(api_client):
    product = Product.objects.create(name='Bowl', description='', price='3.00')
    upload = SimpleUploadedFile('test.png', _png_bytes(), content_type='image/png')
    resp = api_client.post(
        f'/api/products/{product.id}/images/',
        {'images': upload},
        format='multipart',
    )
    assert resp.status_code == 401
