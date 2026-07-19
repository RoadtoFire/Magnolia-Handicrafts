from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

ACCESS_COOKIE_NAME = 'access_token'
REFRESH_COOKIE_NAME = 'refresh_token'

ACCESS_COOKIE_MAX_AGE = int(timedelta(hours=1).total_seconds())
REFRESH_COOKIE_MAX_AGE = int(timedelta(days=14).total_seconds())


def _cookie_kwargs(max_age):
    return {
        'max_age': max_age,
        'httponly': True,
        'secure': not settings.DEBUG,
        'samesite': 'Lax',
        'domain': settings.AUTH_COOKIE_DOMAIN,
        'path': '/',
    }


def _set_auth_cookies(response, user):
    """Issue a fresh access/refresh token pair as httpOnly cookies."""
    refresh = RefreshToken.for_user(user)
    response.set_cookie(ACCESS_COOKIE_NAME, str(refresh.access_token), **_cookie_kwargs(ACCESS_COOKIE_MAX_AGE))
    response.set_cookie(REFRESH_COOKIE_NAME, str(refresh), **_cookie_kwargs(REFRESH_COOKIE_MAX_AGE))
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(request, username=username, password=password)

    # Admin-only login: this project has no customer-facing account system
    # yet, so any non-staff user (even if credentials are valid) is rejected.
    if user is None or not user.is_staff:
        return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

    response = Response({'username': user.username}, status=status.HTTP_200_OK)
    return _set_auth_cookies(response, user)


login_view.cls.throttle_scope = 'auth'


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_view(request):
    raw_refresh = request.COOKIES.get(REFRESH_COOKIE_NAME)
    if raw_refresh is None:
        return Response({'detail': 'No refresh token cookie.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        refresh = RefreshToken(raw_refresh)
        new_access = str(refresh.access_token)
    except Exception:
        return Response({'detail': 'Invalid or expired refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)

    response = Response({'detail': 'Token refreshed.'}, status=status.HTTP_200_OK)
    response.set_cookie(ACCESS_COOKIE_NAME, new_access, **_cookie_kwargs(ACCESS_COOKIE_MAX_AGE))
    return response


refresh_view.cls.throttle_scope = 'auth'


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    # Note: this project does not enable SimpleJWT's token_blacklist app
    # (kept out deliberately to avoid an extra migration/dependency surface
    # for a single-admin-user store). Logout only clears the cookies
    # client-side; any already-issued access/refresh token remains
    # cryptographically valid until it naturally expires (access: ~1h,
    # refresh: ~14d). Revisit if multi-admin/shared-device use grows.
    response = Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)
    response.delete_cookie(ACCESS_COOKIE_NAME, domain=settings.AUTH_COOKIE_DOMAIN, path='/')
    response.delete_cookie(REFRESH_COOKIE_NAME, domain=settings.AUTH_COOKIE_DOMAIN, path='/')
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response({'username': request.user.username})
