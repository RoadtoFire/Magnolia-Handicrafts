from abc import ABC, abstractmethod


class WebhookEvent:
    """
    Normalized representation of an inbound gateway webhook/callback,
    produced by PaymentGateway.parse_webhook() after the raw request has
    already been signature-verified.
    """

    def __init__(self, gateway_tracker, status, raw):
        self.gateway_tracker = gateway_tracker
        # Normalized status: 'succeeded' | 'failed' | 'pending'
        self.status = status
        self.raw = raw


class PaymentGateway(ABC):
    """
    Common interface every payment gateway integration must implement, so
    payments/views.py can treat Safepay, Easypaisa, (and any future gateway)
    identically.
    """

    name = None

    @abstractmethod
    def initiate(self, payment):
        """
        Call the gateway's API to start a hosted checkout for the given
        (unsaved or saved) Payment instance.

        Returns a dict: {'redirect_url': str, 'tracker': str}
        """
        raise NotImplementedError

    @abstractmethod
    def verify_signature(self, request) -> bool:
        """
        Verify that an inbound webhook/callback request actually came from
        the gateway (HMAC/hash check against the raw request body). Must
        be called - and must return True - before parse_webhook() is ever
        invoked or the payload is trusted in any way.
        """
        raise NotImplementedError

    @abstractmethod
    def parse_webhook(self, request) -> 'WebhookEvent':
        """
        Parse an already signature-verified webhook/callback request into
        a normalized WebhookEvent.
        """
        raise NotImplementedError
