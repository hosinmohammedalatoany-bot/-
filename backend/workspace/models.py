import uuid

from django.db import models


class SavedFilter(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        "accounts.ShowroomUser",
        on_delete=models.CASCADE,
        related_name="saved_filters",
    )
    module_key = models.CharField(max_length=64, db_index=True)
    name = models.CharField(max_length=120)
    query = models.JSONField(default=dict, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["module_key", "name"]
        unique_together = [("owner", "module_key", "name")]

    def __str__(self) -> str:
        return f"{self.module_key}:{self.name}"
