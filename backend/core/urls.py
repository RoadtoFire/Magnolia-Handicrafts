from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('store.urls')),
    path('api/payments/', include('payments.urls')),
]

# Serve media from the local filesystem whenever Cloudinary isn't configured
# (i.e. no CLOUDINARY_URL is set) - this covers local dev out of the box,
# regardless of DEBUG. When Cloudinary IS configured, media is served
# directly from Cloudinary's CDN and this urlpattern isn't needed.
if not settings.USE_CLOUDINARY:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
