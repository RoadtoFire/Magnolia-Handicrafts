import hashlib
import hmac
import json
import uuid

import requests
from django.conf import settings

from .base import PaymentGateway, WebhookEvent


class EasypaisaGateway(PaymentGateway):
    """
    Easypaisa (Telenor Microfinance Bank) hosted checkout / mobile wallet
    integration.

    *** VERIFY BEFORE GOING LIVE - especially this one ***
    Easypaisa merchant onboarding is an external dependency that was not
    available while writing this integration (no sandbox `storeId`/
    `hashKey` pair to test against). The request/response field names,
    endpoint paths, and hash construction below are structured to match the
    commonly-documented Easypaisa "Open API" merchant checkout flow
    (storeId / orderRefNumber / amount / postBackURL / merchantHashedReq),
    but MUST be verified field-by-field against the real merchant docs
    Easypaisa provides once onboarding completes, and exercised against
    their sandbox before accepting real payments. Everything gateway-shape-
    specific is isolated in `_build_init_payload()` / `_compute_hash()` and
    `verify_signature()`.
    """

    name = 'easypaisa'

    SANDBOX_BASE_URL = 'https://easypaystg.easypaisa.com.pk'
    PRODUCTION_BASE_URL = 'https://easypay.easypaisa.com.pk'

    SIGNATURE_HEADER = 'HTTP_X_EP_HASH'  # placeholder header name - confirm against real docs

    @property
    def base_url(self):
        return (
            self.PRODUCTION_BASE_URL
            if settings.EASYPAISA_ENV == 'production'
            else self.SANDBOX_BASE_URL
        )

    def _compute_hash(self, fields: dict) -> str:
        """
        Easypaisa's merchant docs describe a SHA-256 hash of a
        pipe/ampersand-joined ordered set of request fields, keyed with the
        merchant hash key. Exact field order/format MUST be confirmed
        against the real docs - this is a structurally-correct placeholder.
        """
        joined = '&'.join(f'{key}={value}' for key, value in sorted(fields.items()))
        return hmac.new(
            settings.EASYPAISA_HASH_KEY.encode('utf-8'),
            joined.encode('utf-8'),
            hashlib.sha256,
        ).hexdigest()

    def _build_init_payload(self, payment, order_ref):
        """
        Isolates the exact Easypaisa "initiate transaction" request shape.
        VERIFY against Easypaisa's real merchant integration docs before
        going live.
        """
        fields = {
            'storeId': settings.EASYPAISA_STORE_ID,
            'orderRefNumber': order_ref,
            'amount': str(payment.amount),
            'postBackURL': f'{settings.FRONTEND_URL}/checkout/result?order={payment.order.public_id}',
        }
        fields['merchantHashedReq'] = self._compute_hash(fields)
        return fields

    def initiate(self, payment):
        order_ref = f"ep-{uuid.uuid4().hex}"
        payload = self._build_init_payload(payment, order_ref)

        response = requests.post(
            f'{self.base_url}/easypay/Index.jsf',
            data=payload,
            timeout=15,
        )
        response.raise_for_status()

        # Easypaisa's hosted checkout is typically a redirect-to-form flow
        # rather than a JSON API returning a URL directly; in practice this
        # usually means rendering/POSTing a form to their endpoint with the
        # signed fields as hidden inputs. We model it here as a redirect URL
        # with the signed fields as a query string for simplicity - CONFIRM
        # this matches the real integration approach (may need a POST-redirect
        # intermediate page on the frontend instead).
        query = '&'.join(f'{k}={v}' for k, v in payload.items())
        redirect_url = f'{self.base_url}/easypay/Index.jsf?{query}'

        return {'redirect_url': redirect_url, 'tracker': order_ref}

    def verify_signature(self, request) -> bool:
        signature = request.META.get(self.SIGNATURE_HEADER, '')
        if not signature or not settings.EASYPAISA_HASH_KEY:
            return False

        try:
            body = json.loads(request.body)
        except (ValueError, TypeError):
            return False

        fields = {k: v for k, v in body.items() if k != 'merchantHashedReq'}
        expected = self._compute_hash(fields)

        # Constant-time comparison - never use `==` for signature checks.
        return hmac.compare_digest(expected, signature)

    def parse_webhook(self, request) -> WebhookEvent:
        body = json.loads(request.body)

        gateway_tracker = body.get('orderRefNumber')
        raw_status = str(body.get('transactionStatus') or body.get('status') or '').lower()

        if raw_status in ('paid', 'success', 'succeeded', '0000'):
            status = 'succeeded'
        elif raw_status in ('failed', 'cancelled', 'error'):
            status = 'failed'
        else:
            status = 'pending'

        return WebhookEvent(gateway_tracker=gateway_tracker, status=status, raw=body)
