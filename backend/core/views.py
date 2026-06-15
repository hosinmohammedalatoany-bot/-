from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    db_ok = False
    db_error = None
    try:
        from django.db import connection

        connection.ensure_connection()
        db_ok = True
    except Exception as exc:  # noqa: BLE001 — health probe
        db_error = str(exc)

    return Response(
        {
            "status": "ok" if db_ok else "degraded",
            "service": "baraa-raed-api",
            "database": "connected" if db_ok else "unavailable",
            "database_error": db_error if not db_ok else None,
            "debug": settings.DEBUG,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request):
    return Response(
        {
            "name": "Baraa Raed API",
            "version": "0.1.0",
            "health": "/api/health/",
            "auth": {
                "setup_status": "/api/auth/setup/status/",
                "setup": "/api/auth/setup/",
                "login": "/api/auth/login/",
                "register": "/api/auth/register/",
                "refresh": "/api/auth/refresh/",
                "logout": "/api/auth/logout/",
                "me": "/api/auth/me/",
                "forgot_password": "/api/auth/forgot-password/",
                "reset_password": "/api/auth/reset-password/",
            },
        }
    )
