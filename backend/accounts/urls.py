from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("setup/status/", views.SetupStatusView.as_view(), name="setup-status"),
    path("setup/", views.SetupAdminView.as_view(), name="setup"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("logout-all/", views.LogoutAllView.as_view(), name="logout-all"),
    path("me/", views.MeView.as_view(), name="me"),
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="reset-password"),
    path("change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify-email"),
    path("permissions/check/", views.PermissionCheckView.as_view(), name="perm-check"),
    path("audit-logs/", views.AuditLogListView.as_view(), name="audit-logs"),
    path("sessions/", views.SessionsListView.as_view(), name="sessions"),
    path("users/pending/", views.PendingUsersView.as_view(), name="pending-users"),
]
