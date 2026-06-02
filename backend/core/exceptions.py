from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        payload = {"error": True, "detail": response.data}
        response.data = payload
        if response.status_code >= 500:
            try:
                from ops.models import SystemErrorLog
                from ops.services import log_system_error

                request = context.get("request")
                user_email = ""
                path = ""
                if request is not None:
                    path = getattr(request, "path", "") or ""
                    user = getattr(request, "user", None)
                    if user and getattr(user, "is_authenticated", False):
                        user_email = getattr(user, "email", "") or ""
                log_system_error(
                    level=SystemErrorLog.LEVEL_ERROR,
                    source="api",
                    message=str(exc)[:500],
                    details={"status": response.status_code, "detail": response.data},
                    request_path=path,
                    user_email=user_email,
                )
            except Exception:
                pass
    return response
