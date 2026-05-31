# رابط التشغيل الحالي (جلسة Cloud Agent)

> هذا الرابط مؤقت من Cloudflare Quick Tunnel ويتوقف عند إيقاف `cloudflared` أو السيرفر. إذا ظهر `ERR_FAILED` أعد تشغيل النفق (`npm run tunnel`).

| البند | القيمة |
|--------|--------|
| **الرابط العام** | https://physically-prepared-michael-authentication.trycloudflare.com |
| تسجيل الدخول | https://physically-prepared-michael-authentication.trycloudflare.com/login |
| **إنشاء حساب** (يعمل مباشرة — أول حساب = مدير النظام) | https://physically-prepared-michael-authentication.trycloudflare.com/register |
| إعداد بديل | https://physically-prepared-michael-authentication.trycloudflare.com/setup |
| لوحة التحكم | https://physically-prepared-michael-authentication.trycloudflare.com/dashboard/dashboard |

**آخر تحديث:** 2026-05-31 — أُزيلت رسائل PUBLIC_BASE_URL من الواجهة؛ النفق يستخدم الرابط الحالي تلقائياً.

## إعادة تشغيل الرابط

```bash
PORT=3000 bash scripts/start-tunnel.sh
```

أو يدوياً:

```bash
npm run build
fuser -k 3000/tcp 2>/dev/null || true
HOSTNAME=0.0.0.0 PORT=3000 npm run start
# في طرفية ثانية:
cloudflared tunnel --url http://127.0.0.1:3000
```

انسخ الرابط الجديد من مخرجات `cloudflared` (سطر `trycloudflare.com`).

## للإنتاج الدائم (VPS)

راجع `docs/DEPLOY_PUBLIC_URL.md` — PM2 + Nginx + SSL + `NEXT_PUBLIC_APP_URL=https://app.powerxerp.com`
