import uuid

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from store.models import Order

from .gateways import get_gateway
from .models import Payment


@api_view(['POST'])
@permission_classes([AllowAny])
def initiate_view(request):
    """
    POST /api/payments/initiate/
    Body: {"order_public_id": "<uuid>", "method": "safepay" | "easypaisa"}

    Starts a hosted-checkout session with the requested gateway for an
    existing order and returns {"redirect_url": ...} for the frontend to
    send the browser to.
    """
    order_public_id = request.data.get('order_public_id')
    method = request.data.get('method')

    if method not in ('safepay', 'easypaisa'):
        return Response({'detail': 'method must be "safepay" or "easypaisa".'}, status=400)

    try:
        order = Order.objects.get(public_id=order_public_id)
    except (Order.DoesNotExist, ValueError, TypeError):
        return Response({'detail': 'Order not found.'}, status=404)

    if order.payment_status not in ('unpaid', 'pending'):
        return Response({'detail': 'Order already paid or not eligible for payment.'}, status=400)

    gateway = get_gateway(method)

    # Create the Payment row up front with a temporary, locally-unique
    # placeholder tracker (gateway_tracker is unique=True and NOT NULL, and
    # gateway.initiate() needs a real Payment instance - with .order/.amount
    # - to build its request). Once initiate() returns the gateway's real
    # tracker we swap it in. If initiate() raises, we delete the placeholder
    # row rather than leaving an orphaned/broken Payment behind.
    placeholder_tracker = f'pending-{uuid.uuid4()}'
    payment = Payment.objects.create(
        order=order,
        gateway=method,
        amount=order.total_amount,
        gateway_tracker=placeholder_tracker,
    )

    try:
        result = gateway.initiate(payment)
    except Exception:
        payment.delete()
        return Response({'detail': 'Failed to initiate payment with the gateway.'}, status=502)

    payment.gateway_tracker = result['tracker']
    payment.save(update_fields=['gateway_tracker'])

    order.payment_method = method
    order.save(update_fields=['payment_method'])

    return Response({'redirect_url': result['redirect_url']}, status=200)


initiate_view.cls.throttle_scope = 'payments'


def _handle_webhook(request, method):
    """
    Shared webhook handling logic for both gateways. Signature verification
    MUST happen (and pass) before the payload is trusted or even parsed -
    the check below returns 400 immediately on failure, before
    gateway.parse_webhook() ever touches the body.
    """
    gateway = get_gateway(method)

    if not gateway.verify_signature(request):
        return Response({'detail': 'Invalid signature.'}, status=400)

    event = gateway.parse_webhook(request)

    try:
        payment = Payment.objects.select_related('order').get(gateway_tracker=event.gateway_tracker)
    except Payment.DoesNotExist:
        return Response({'detail': 'Unknown payment.'}, status=404)

    # Idempotency is mandatory: real gateways retry/replay webhooks. Once a
    # payment has reached a terminal state, do not re-process it - just
    # acknowledge with 200 so the gateway stops retrying, and leave
    # everything (status, updated_at, order state) untouched.
    if payment.is_terminal:
        return Response({'detail': 'Already processed.'}, status=200)

    payment.status = event.status
    payment.raw_response = event.raw
    payment.save(update_fields=['status', 'raw_response', 'updated_at'])

    order = payment.order
    if event.status == 'succeeded':
        order.payment_status = 'paid'
        order.status = 'confirmed'
        order.save(update_fields=['payment_status', 'status'])
    elif event.status == 'failed':
        order.payment_status = 'failed'
        order.save(update_fields=['payment_status'])

    return Response({'detail': 'ok'}, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def safepay_webhook_view(request):
    """
    POST /api/payments/webhooks/safepay/
    Server-to-server callback from Safepay. No cookies/session involved -
    DRF's @api_view already applies csrf_exempt via APIView.as_view().
    """
    return _handle_webhook(request, 'safepay')


@api_view(['POST'])
@permission_classes([AllowAny])
def easypaisa_webhook_view(request):
    """
    POST /api/payments/webhooks/easypaisa/
    Server-to-server callback from Easypaisa.
    """
    return _handle_webhook(request, 'easypaisa')


@api_view(['GET'])
@permission_classes([AllowAny])
def status_view(request):
    """
    GET /api/payments/status/?order=<public_id>

    Polled by the frontend after the browser is redirected back from the
    gateway's hosted checkout page.

    IMPORTANT: the browser redirect back from the gateway must NEVER be
    trusted as proof of payment on its own - it is only UX (send the user
    somewhere to see a status). The webhook handlers above are the sole
    source of truth for payment_status; this endpoint only reads whatever
    state a verified webhook has already written.
    """
    order_public_id = request.query_params.get('order')
    try:
        order = Order.objects.get(public_id=order_public_id)
    except (Order.DoesNotExist, ValueError, TypeError):
        return Response({'detail': 'Order not found.'}, status=404)

    return Response({'payment_status': order.payment_status, 'status': order.status})


@api_view(['GET'])
@permission_classes([AllowAny])
def methods_view(request):
    """
    GET /api/payments/methods/

    Reports which payment gateways currently have credentials configured,
    so the frontend can hide checkout options that aren't ready yet.
    """
    return Response({
        'cod': True,
        'safepay': bool(settings.SAFEPAY_API_KEY),
        'easypaisa': bool(settings.EASYPAISA_STORE_ID),
    })
