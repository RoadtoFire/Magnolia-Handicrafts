from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from store.models import Order, OrderItem, Product

User = get_user_model()


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


@pytest.fixture
def expensive_product(db):
    return Product.objects.create(name='Hand-carved Chest', description='', price='5000.00', is_in_stock=True)


@pytest.fixture
def out_of_stock_product(db):
    return Product.objects.create(name='Sold Out Vase', description='', price='20.00', is_in_stock=False)


@pytest.mark.django_db
def test_order_total_is_computed_server_side_not_trusted_from_client(api_client, expensive_product):
    """
    The client claims the product costs 1.00 and the order total is 1.00,
    but the real product price is 5000.00. The server must ignore both
    spoofed values and persist the REAL computed total.
    """
    payload = {
        'full_name': 'Attacker',
        'email': 'attacker@example.com',
        'phone': '0300-0000000',
        'address': '123 Exploit St',
        'city': 'Lahore',
        'total_amount': '1.00',  # spoofed
        'items': [
            {'product': expensive_product.id, 'quantity': 1, 'price': '1.00'},  # spoofed
        ],
    }
    resp = api_client.post('/api/orders/', payload, format='json')

    assert resp.status_code == 201, resp.data

    order = Order.objects.get(id=resp.data['id'])
    assert order.total_amount == Decimal('5000.00')
    assert resp.data['total_amount'] == '5000.00'

    item = OrderItem.objects.get(order=order)
    assert item.price == Decimal('5000.00')


@pytest.mark.django_db
def test_order_total_sums_multiple_items_at_real_prices(api_client):
    product_a = Product.objects.create(name='Mug', description='', price='10.00', is_in_stock=True)
    product_b = Product.objects.create(name='Bowl', description='', price='25.50', is_in_stock=True)

    payload = {
        'full_name': 'Real Customer',
        'email': 'customer@example.com',
        'phone': '0300-1111111',
        'address': '456 Honest Ave',
        'city': 'Karachi',
        'items': [
            {'product': product_a.id, 'quantity': 3},
            {'product': product_b.id, 'quantity': 2},
        ],
    }
    resp = api_client.post('/api/orders/', payload, format='json')

    assert resp.status_code == 201, resp.data
    order = Order.objects.get(id=resp.data['id'])
    # 3 * 10.00 + 2 * 25.50 = 81.00
    assert order.total_amount == Decimal('81.00')


@pytest.mark.django_db
def test_ordering_out_of_stock_product_is_rejected(api_client, out_of_stock_product):
    payload = {
        'full_name': 'Hopeful Buyer',
        'email': 'buyer@example.com',
        'phone': '0300-2222222',
        'address': '789 Wishful Rd',
        'city': 'Islamabad',
        'items': [
            {'product': out_of_stock_product.id, 'quantity': 1},
        ],
    }
    resp = api_client.post('/api/orders/', payload, format='json')

    assert resp.status_code == 400
    assert not Order.objects.exists()


@pytest.mark.django_db
def test_cod_order_defaults_to_confirmed_and_unpaid(api_client, expensive_product):
    payload = {
        'full_name': 'COD Customer',
        'email': 'cod@example.com',
        'phone': '0300-3333333',
        'address': '1 Cash Lane',
        'city': 'Lahore',
        'items': [{'product': expensive_product.id, 'quantity': 1}],
    }
    resp = api_client.post('/api/orders/', payload, format='json')
    assert resp.status_code == 201, resp.data

    order = Order.objects.get(id=resp.data['id'])
    assert order.payment_method == 'cod'
    assert order.status == 'confirmed'
    assert order.payment_status == 'unpaid'
    assert resp.data['public_id']  # exposed for payment flow / status polling


@pytest.mark.django_db
def test_safepay_order_defaults_to_new_and_pending(api_client, expensive_product):
    payload = {
        'full_name': 'Card Customer',
        'email': 'card@example.com',
        'phone': '0300-4444444',
        'address': '2 Card Lane',
        'city': 'Lahore',
        'payment_method': 'safepay',
        'items': [{'product': expensive_product.id, 'quantity': 1}],
    }
    resp = api_client.post('/api/orders/', payload, format='json')
    assert resp.status_code == 201, resp.data

    order = Order.objects.get(id=resp.data['id'])
    assert order.payment_method == 'safepay'
    assert order.status == 'new'
    assert order.payment_status == 'pending'


@pytest.fixture
def existing_order(db, expensive_product):
    order = Order.objects.create(
        full_name='Existing Customer',
        email='existing@example.com',
        phone='0300-5555555',
        address='3 Fulfillment Rd',
        city='Lahore',
        total_amount=Decimal('5000.00'),
    )
    OrderItem.objects.create(order=order, product=expensive_product, quantity=1, price=Decimal('5000.00'))
    return order


@pytest.mark.django_db
def test_admin_can_advance_order_status(admin_client, existing_order):
    resp = admin_client.patch(f'/api/orders/{existing_order.id}/', {'status': 'dispatched'}, format='json')
    assert resp.status_code == 200, resp.data

    existing_order.refresh_from_db()
    assert existing_order.status == 'dispatched'


@pytest.mark.django_db
def test_anonymous_cannot_update_order_status(api_client, existing_order):
    resp = api_client.patch(f'/api/orders/{existing_order.id}/', {'status': 'dispatched'}, format='json')
    assert resp.status_code == 401

    existing_order.refresh_from_db()
    assert existing_order.status == 'new'


@pytest.mark.django_db
def test_updating_status_does_not_touch_payment_status_or_total(admin_client, existing_order):
    existing_order.payment_status = 'paid'
    existing_order.save(update_fields=['payment_status'])

    resp = admin_client.patch(
        f'/api/orders/{existing_order.id}/',
        {'status': 'delivered', 'payment_status': 'refunded', 'total_amount': '1.00'},
        format='json',
    )
    assert resp.status_code == 200, resp.data

    existing_order.refresh_from_db()
    assert existing_order.status == 'delivered'
    # Read-only fields silently ignored, not applied - the request didn't
    # error, but it also didn't get to overwrite trusted server state.
    assert existing_order.payment_status == 'paid'
    assert existing_order.total_amount == Decimal('5000.00')
