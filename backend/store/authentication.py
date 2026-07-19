from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Reads the JWT access token from an httpOnly `access_token` cookie
    instead of the `Authorization: Bearer <token>` header used by the
    default JWTAuthentication. This keeps tokens out of JS-accessible
    storage (no localStorage), reducing XSS token-theft risk.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

    # Note: we deliberately keep the inherited `authenticate_header()` (which
    # returns a `Bearer realm="api"` challenge) rather than suppressing it.
    # DRF's exception handling (`APIView.handle_exception`) uses that header
    # to decide between 401 and 403 for anonymous requests: since a real
    # challenge is present, anonymous requests against permission-restricted
    # endpoints correctly get 401 Unauthorized (not authenticated) rather
    # than 403 Forbidden (authenticated but not permitted). This is
    # idiomatic DRF/REST behaviour and applies consistently across every
    # view using this authentication class - see store/tests/test_products.py
    # for the corresponding assertions.
