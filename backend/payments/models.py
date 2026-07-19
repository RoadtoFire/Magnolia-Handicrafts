from django.db import models


class Payment(models.Model):
    """
    One row per payment attempt against an Order. An Order can have more
    than one Payment (e.g. a failed attempt followed by a retry), which is
    why this is a FK rather than a OneToOne.
    """
    order = models.ForeignKey('store.Order', related_name='payments', on_delete=models.CASCADE)
    gateway = models.CharField(max_length=20, choices=[('safepay', 'Safepay'), ('easypaisa', 'Easypaisa')])
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='PKR')
    status = models.CharField(
        max_length=20,
        choices=[
            ('initiated', 'Initiated'),
            ('pending', 'Pending'),
            ('succeeded', 'Succeeded'),
            ('failed', 'Failed'),
            ('cancelled', 'Cancelled'),
        ],
        default='initiated',
    )
    # The gateway's own reference for this payment attempt (Safepay "tracker",
    # Easypaisa "orderRefNumber", etc). Used to correlate inbound webhooks
    # back to this row - must be unique so a webhook lookup is unambiguous.
    gateway_tracker = models.CharField(max_length=200, unique=True, db_index=True)
    gateway_transaction_id = models.CharField(max_length=200, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    TERMINAL_STATUSES = ('succeeded', 'failed', 'cancelled')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.gateway} payment #{self.pk} for order #{self.order_id} ({self.status})"

    @property
    def is_terminal(self):
        return self.status in self.TERMINAL_STATUSES
