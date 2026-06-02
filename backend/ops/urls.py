from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.OpsHealthView.as_view(), name="ops-health"),
    path("backups/", views.BackupListCreateView.as_view(), name="ops-backups"),
    path(
        "backups/<uuid:backup_id>/download/",
        views.BackupDownloadView.as_view(),
        name="ops-backup-download",
    ),
    path(
        "backups/<uuid:backup_id>/restore/",
        views.BackupRestoreView.as_view(),
        name="ops-backup-restore",
    ),
    path("error-logs/", views.SystemErrorLogListView.as_view(), name="ops-error-logs"),
    path("sync-logs/", views.ClientSyncLogListCreateView.as_view(), name="ops-sync-logs"),
]
