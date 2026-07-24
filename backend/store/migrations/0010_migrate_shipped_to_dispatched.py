from django.db import migrations


def shipped_to_dispatched(apps, schema_editor):
    Order = apps.get_model('store', 'Order')
    Order.objects.filter(status='shipped').update(status='dispatched')


def dispatched_to_shipped(apps, schema_editor):
    # Best-effort reverse - 'dispatched' rows may also include ones that
    # were never 'shipped' to begin with, but this is the closest inverse.
    Order = apps.get_model('store', 'Order')
    Order.objects.filter(status='dispatched').update(status='shipped')


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0009_alter_order_status'),
    ]

    operations = [
        migrations.RunPython(shipped_to_dispatched, dispatched_to_shipped),
    ]
