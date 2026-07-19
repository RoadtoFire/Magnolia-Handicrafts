import hashlib
import hmac
import json
import uuid

import requests
from django.conf import settings

from .base import PaymentGateway, WebhookEvent


class SafepayGateway(PaymentGateway):
    """
    Safepay (https://getsafepay.com) hosted checkout integration - card
    payments for Pakistani merchants.

    *** VERIFY BEFORE GOING LIVE ***
    This integration was written without live API access to Safepay. The
    request/response field names, endpoint paths, and signature header name
    below are best-effort based on publicly documented conventions and may
    have changed. Everything gateway-shape-specific is isolated in
    `_build_init_payload()` and the header name in `verify_signature()` -
    run a sandbox smoke test against https://docs.getsafepay.com and adjust
    those two spots before accepting real payments.
    """

    name = 'safepay'

    SANDBOX_BASE_URL = 'https://sandbox.api.getsafepay.com'
    PRODUCTION_BASE_URL = 'https://api.getsafepay.com'

    SIGNATURE_HEADER = 'HTTP_X_SFPY_SIGNATURE'  # X-SFPY-Signature, as seen by Django's WSGI request.META

    @property
    def base_url(self):
        return (
            self.PRODUCTION_BASE_URL
            if settings.SAFEPAY_ENV == 'production'
            else self.SANDBOX_BASE_URL
        )

    def _build_init_payload(self, payment):
        """
        Isolates the exact Safepay "create session / init" request shape.
        VERIFY against https://docs.getsafepay.com before going live.
        """
        return {
            'client': settings.SAFEPAY_API_KEY,
            # Safepay historically expects amounts in the smallest currency
            # unit (paisa for PKR) - confirm this is still true.
            'amount': int(payment.amount * 100),
            'currency': payment.currency,
            'order_id': str(payment.order.public_id),
            'source': 'magnolia-handicrafts-web',
        }

    def initiate(self, payment):
        tracker = f"sfpy-{uuid.uuid4().hex}"
        payload = self._build_init_payload(payment)

        response = requests.post(
            f'{self.base_url}/order/v1/init',
            json=payload,
            headers={
                'Authorization': f'Bearer {settings.SAFEPAY_SECRET_KEY}',
                'Content-Type': 'application/json',
            },
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()

        # Prefer whatever tracker the gateway actually returns; fall back to
        # our locally generated one so initiate() never fails purely because
        # a response field name changed upstream.
        gateway_tracker = data.get('data', {}).get('token') or data.get('tracker') or tracker

        redirect_url = (
            f'{self.base_url.replace("api.", "checkout.")}/checkout'
            f'?tracker={gateway_tracker}'
            f'&redirect_url={settings.FRONTEND_URL}/checkout/result?order={payment.order.public_id}'
        )

        return {'redirect_url': redirect_url, 'tracker': gateway_tracker}

    def verify_signature(self, request) -> bool:
        signature = request.META.get(self.SIGNATURE_HEADER, '')
        if not signature or not settings.SAFEPAY_WEBHOOK_SECRET:
            return False

        expected = hmac.new(
            settings.SAFEPAY_WEBHOOK_SECRET.encode('utf-8'),
            request.body,
            hashlib.sha256,
        ).hexdigest()

        # Constant-time comparison is critical here - a naive `==` leaks
        # timing information an attacker can use to forge a valid signature
        # byte-by-byte.
        return hmac.compare_digest(expected, signature)

    def parse_webhook(self, request) -> WebhookEvent:
        body = json.loads(request.body)
        data = body.get('data', body)

        gateway_tracker = data.get('token') or data.get('tracker')
        raw_state = (data.get('state') or data.get('status') or '').lower()

        if raw_state in ('tracker_ended', 'paid', 'success', 'succeeded', 'completed'):
            status = 'succeeded'
        elif raw_state in ('tracker_failed', 'failed', 'cancelled', 'declined'):
            status = 'failed'
        else:
            status = 'pending'

        return WebhookEvent(gateway_tracker=gateway_tracker, status=status, raw=body)
