from django.urls import path

from . import views

urlpatterns = [
    path('initiate/', views.initiate_view, name='payments-initiate'),
    path('webhooks/safepay/', views.safepay_webhook_view, name='payments-webhook-safepay'),
    path('webhooks/easypaisa/', views.easypaisa_webhook_view, name='payments-webhook-easypaisa'),
    path('status/', views.status_view, name='payments-status'),
    path('methods/', views.methods_view, name='payments-methods'),
]
