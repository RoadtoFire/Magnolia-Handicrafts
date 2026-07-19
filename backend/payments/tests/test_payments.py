import hashlib
import hmac
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from rest_framework.test import APIClient

from payments.models import Payment
from store.models import Order, OrderItem, Product


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def order(db):
    product = Product.objects.create(name='Rug', description='', price='2000.00', is_in_stock=True)
    order = Order.objects.create(
        full_name='Jane Doe',
        email='jane@example.com',
        phone='0300-0000000',
        address='1 Test St',
        city='Lahore',
        total_amount=Decimal('2000.00'),
        payment_method='safepay',
        status='new',
        payment_status='pending',
    )
    OrderItem.objects.create(order=order, product=product, quantity=1, price=Decimal('2000.00'))
    return order


def _mock_safepay_response(tracker='sfpy-mock-token'):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {'data': {'token': tracker}}
    return resp


def _signed_body(secret, body_dict):
    body = json.dumps(body_dict).encode('utf-8')
    sig = hmac.new(secret.encode('utf-8'), body, hashlib.sha256).hexdigest()
    return body, sig


@pytest.mark.django_db
class TestInitiate:
    def test_initiate_safepay_happy_path_creates_one_payment_and_returns_redirect(self, api_client, order, settings):
        settings.SAFEPAY_API_KEY = 'test-key'
        settings.SAFEPAY_SECRET_KEY = 'test-secret'

        with patch('payments.gateways.safepay.requests.post', return_value=_mock_safepay_response()) as mock_post:
            resp = api_client.post(
                '/api/payments/initiate/',
                {'order_public_id': str(order.public_id), 'method': 'safepay'},
                format='json',
            )

        assert resp.status_code == 200, resp.data
        assert resp.data['redirect_url']
        assert mock_post.called

        assert Payment.objects.filter(order=order).count() == 1
        payment = Payment.objects.get(order=order)
        assert payment.gateway == 'safepay'
        assert payment.gateway_tracker == 'sfpy-mock-token'
        assert payment.amount == Decimal('2000.00')
        assert payment.status == 'initiated'

        order.refresh_from_db()
        assert order.payment_method == 'safepay'

    def test_initiate_on_already_paid_order_is_rejected_and_creates_no_payment(self, api_client, order):
        order.payment_status = 'paid'
        order.save(update_fields=['payment_status'])

        with patch('payments.gateways.safepay.requests.post') as mock_post:
            resp = api_client.post(
                '/api/payments/initiate/',
                {'order_public_id': str(order.public_id), 'method': 'safepay'},
                format='json',
            )

        assert resp.status_code == 400
        assert not mock_post.called
        assert Payment.objects.filter(order=order).count() == 0

    def test_initiate_with_cod_method_is_rejected(self, api_client, order):
        resp = api_client.post(
            '/api/payments/initiate/',
            {'order_public_id': str(order.public_id), 'method': 'cod'},
            format='json',
        )
        assert resp.status_code == 400
        assert Payment.objects.filter(order=order).count() == 0

    def test_initiate_for_unknown_order_returns_404(self, api_client):
        resp = api_client.post(
            '/api/payments/initiate/',
            {'order_public_id': '00000000-0000-0000-0000-000000000000', 'method': 'safepay'},
            format='json',
        )
        assert resp.status_code == 404


@pytest.mark.django_db
class TestSafepayWebhook:
    def _make_payment(self, order, tracker='sfpy-webhook-token'):
        return Payment.objects.create(
            order=order,
            gateway='safepay',
            amount=order.total_amount,
            gateway_tracker=tracker,
        )

    def test_valid_signed_webhook_marks_payment_and_order_paid(self, api_client, order, settings):
        settings.SAFEPAY_WEBHOOK_SECRET = 'whsec_test'
        payment = self._make_payment(order)

        body_dict = {'data': {'token': 'sfpy-webhook-token', 'state': 'tracker_ended'}}
        body, sig = _signed_body('whsec_test', body_dict)

        resp = api_client.post(
            '/api/payments/webhooks/safepay/',
            data=body,
            content_type='application/json',
            HTTP_X_SFPY_SIGNATURE=sig,
        )
        assert resp.status_code == 200

        payment.refresh_from_db()
        order.refresh_from_db()
        assert payment.status == 'succeeded'
        assert order.payment_status == 'paid'
        assert order.status == 'confirmed'

    def test_tampered_signature_is_rejected_and_state_unchanged(self, api_client, order, settings):
        settings.SAFEPAY_WEBHOOK_SECRET = 'whsec_test'
        payment = self._make_payment(order)

        body_dict = {'data': {'token': 'sfpy-webhook-token', 'state': 'tracker_ended'}}
        body, _real_sig = _signed_body('whsec_test', body_dict)

        resp = api_client.post(
            '/api/payments/webhooks/safepay/',
            data=body,
            content_type='application/json',
            HTTP_X_SFPY_SIGNATURE='0' * 64,  # wrong signature
        )
        assert resp.status_code == 400

        payment.refresh_from_db()
        order.refresh_from_db()
        assert payment.status == 'initiated'
        assert order.payment_status == 'pending'

    def test_missing_signature_header_is_rejected(self, api_client, order, settings):
        settings.SAFEPAY_WEBHOOK_SECRET = 'whsec_test'
        payment = self._make_payment(order)

        body_dict = {'data': {'token': 'sfpy-webhook-token', 'state': 'tracker_ended'}}
        body = json.dumps(body_dict).encode('utf-8')

        resp = api_client.post(
            '/api/payments/webhooks/safepay/',
            data=body,
            content_type='application/json',
            # no signature header at all
        )
        assert resp.status_code == 400

        payment.refresh_from_db()
        assert payment.status == 'initiated'

    def test_replayed_valid_webhook_is_idempotent_noop(self, api_client, order, settings):
        settings.SAFEPAY_WEBHOOK_SECRET = 'whsec_test'
        payment = self._make_payment(order)

        body_dict = {'data': {'token': 'sfpy-webhook-token', 'state': 'tracker_ended'}}
        body, sig = _signed_body('whsec_test', body_dict)

        resp1 = api_client.post(
            '/api/payments/webhooks/safepay/',
            data=body,
            content_type='application/json',
            HTTP_X_SFPY_SIGNATURE=sig,
        )
        assert resp1.status_code == 200
        payment.refresh_from_db()
        assert payment.status == 'succeeded'
        first_updated_at = payment.updated_at

        # Replay the exact same (still validly-signed) webhook.
        resp2 = api_client.post(
            '/api/payments/webhooks/safepay/',
            data=body,
            content_type='application/json',
            HTTP_X_SFPY_SIGNATURE=sig,
        )
        assert resp2.status_code == 200

        payment.refresh_from_db()
        order.refresh_from_db()
        assert payment.status == 'succeeded'
        # No re-processing happened on replay - updated_at must be untouched.
        assert payment.updated_at == first_updated_at
        assert order.payment_status == 'paid'

    def test_failed_status_webhook_marks_payment_and_order_failed(self, api_client, order, settings):
        settings.SAFEPAY_WEBHOOK_SECRET = 'whsec_test'
        payment = self._make_payment(order)

        body_dict = {'data': {'token': 'sfpy-webhook-token', 'state': 'tracker_failed'}}
        body, sig = _signed_body('whsec_test', body_dict)

        resp = api_client.post(
            '/api/payments/webhooks/safepay/',
            data=body,
            content_type='application/json',
            HTTP_X_SFPY_SIGNATURE=sig,
        )
        assert resp.status_code == 200

        payment.refresh_from_db()
        order.refresh_from_db()
        assert payment.status == 'failed'
        assert order.payment_status == 'failed'


@pytest.mark.django_db
class TestMethodsAndStatus:
    def test_methods_reports_only_configured_gateways(self, api_client, settings):
        settings.SAFEPAY_API_KEY = ''
        settings.EASYPAISA_STORE_ID = 'store-123'

        resp = api_client.get('/api/payments/methods/')
        assert resp.status_code == 200
        assert resp.data == {'cod': True, 'safepay': False, 'easypaisa': True}

    def test_status_endpoint_reflects_order_state(self, api_client, order):
        resp = api_client.get(f'/api/payments/status/?order={order.public_id}')
        assert resp.status_code == 200
        assert resp.data == {'payment_status': order.payment_status, 'status': order.status}

    def test_status_endpoint_unknown_order_404(self, api_client):
        resp = api_client.get('/api/payments/status/?order=00000000-0000-0000-0000-000000000000')
        assert resp.status_code == 404
