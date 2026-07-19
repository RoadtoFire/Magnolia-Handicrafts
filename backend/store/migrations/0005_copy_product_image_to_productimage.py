from django.db import migrations


def copy_images_forward(apps, schema_editor):
    Product = apps.get_model('store', 'Product')
    ProductImage = apps.get_model('store', 'ProductImage')

    # Handles an empty DB / no products with images gracefully - the
    # queryset is simply empty and the loop below is a no-op.
    products_with_images = Product.objects.exclude(image='').exclude(image__isnull=True)

    for product in products_with_images:
        ProductImage.objects.create(
            product=product,
            image=product.image,
            sort_order=0,
        )


def copy_images_backward(apps, schema_editor):
    # Reverse: remove the ProductImage rows this migration created. We can't
    # distinguish "created by this migration" perfectly, so on reverse we
    # simply drop all sort_order=0 images whose (product, image) pairs match
    # the still-present Product.image value. This is best-effort and only
    # matters if someone deliberately migrates backward past this point.
    Product = apps.get_model('store', 'Product')
    ProductImage = apps.get_model('store', 'ProductImage')

    for product in Product.objects.exclude(image='').exclude(image__isnull=True):
        ProductImage.objects.filter(product=product, image=product.image, sort_order=0).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0004_add_product_image_model'),
    ]

    operations = [
        migrations.RunPython(copy_images_forward, copy_images_backward),
    ]
