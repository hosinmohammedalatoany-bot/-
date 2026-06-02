from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        payload = {"error": True, "detail": response.data}
        response.data = payload
    return response
