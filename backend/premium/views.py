from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticatedActive, require_module


class PremiumCapabilitiesView(APIView):
    """Extension points for future premium features — not active in production yet."""

    permission_classes = [IsAuthenticatedActive, require_module("settings")]

    def get(self, request):
        return Response(
            {
                "enabled": False,
                "message": "الميزات المتقدمة قيد التجهيز ولا تُفعّل تلقائياً.",
                "capabilities": [
                    {
                        "key": "ai_pricing",
                        "title": "تسعير ذكي",
                        "status": "planned",
                        "description": "اقتراح أسعار بناءً على السوق والتكلفة.",
                    },
                    {
                        "key": "ai_lead_scoring",
                        "title": "تقييم العملاء المحتملين",
                        "status": "planned",
                        "description": "ترتيب الأولويات للمتابعة.",
                    },
                    {
                        "key": "whatsapp_integration",
                        "title": "تكامل واتساب",
                        "status": "planned",
                        "description": "إرسال واستقبال عبر واجهة النظام.",
                    },
                    {
                        "key": "windows_print_agent",
                        "title": "وكيل طباعة Windows",
                        "status": "planned",
                        "description": "طباعة مباشرة من الطابعة المحلية.",
                    },
                    {
                        "key": "native_mobile",
                        "title": "تطبيق iOS/Android",
                        "status": "planned",
                        "description": "تطبيق أصلي مستقبلاً (PWA متاح حالياً).",
                    },
                    {
                        "key": "bi_dashboard",
                        "title": "لوحة BI",
                        "status": "planned",
                        "description": "تحليلات متقدمة عبر مستودع بيانات.",
                    },
                    {
                        "key": "white_label",
                        "title": "علامة بيضاء",
                        "status": "planned",
                        "description": "تخصيص الهوية لكل عميل.",
                    },
                    {
                        "key": "multi_company",
                        "title": "شركات متعددة",
                        "status": "planned",
                        "description": "عزل بيانات عدة معارض على نفس المنصة.",
                    },
                ],
            }
        )
