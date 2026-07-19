import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(username='staffadmin', password='correct-horse', is_staff=True)


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(username='shopper', password='correct-horse', is_staff=False)


@pytest.mark.django_db
def test_login_with_valid_staff_credentials_sets_cookies_and_returns_username(api_client, staff_user):
    resp = api_client.post(
        '/api/auth/login/',
        {'username': 'staffadmin', 'password': 'correct-horse'},
        format='json',
    )
    assert resp.status_code == 200
    assert resp.data == {'username': 'staffadmin'}

    assert 'access_token' in resp.cookies
    assert 'refresh_token' in resp.cookies
    assert resp.cookies['access_token']['httponly']
    assert resp.cookies['refresh_token']['httponly']


@pytest.mark.django_db
def test_login_with_wrong_password_returns_401(api_client, staff_user):
    resp = api_client.post(
        '/api/auth/login/',
        {'username': 'staffadmin', 'password': 'totally-wrong'},
        format='json',
    )
    assert resp.status_code == 401
    assert 'access_token' not in resp.cookies or not resp.cookies['access_token'].value


@pytest.mark.django_db
def test_login_with_non_staff_user_returns_401(api_client, regular_user):
    resp = api_client.post(
        '/api/auth/login/',
        {'username': 'shopper', 'password': 'correct-horse'},
        format='json',
    )
    assert resp.status_code == 401


@pytest.mark.django_db
def test_me_without_cookie_returns_401(api_client):
    resp = api_client.get('/api/auth/me/')
    assert resp.status_code == 401


@pytest.mark.django_db
def test_me_with_cookie_from_login_succeeds(api_client, staff_user):
    login_resp = api_client.post(
        '/api/auth/login/',
        {'username': 'staffadmin', 'password': 'correct-horse'},
        format='json',
    )
    assert login_resp.status_code == 200

    # Django's test client persists Set-Cookie headers across requests
    # automatically, simulating a browser cookie jar.
    resp = api_client.get('/api/auth/me/')
    assert resp.status_code == 200
    assert resp.data == {'username': 'staffadmin'}


@pytest.mark.django_db
def test_logout_clears_cookies(api_client, staff_user):
    login_resp = api_client.post(
        '/api/auth/login/',
        {'username': 'staffadmin', 'password': 'correct-horse'},
        format='json',
    )
    assert login_resp.status_code == 200

    logout_resp = api_client.post('/api/auth/logout/')
    assert logout_resp.status_code == 200

    resp = api_client.get('/api/auth/me/')
    assert resp.status_code == 401
