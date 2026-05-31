# رابط التشغيل الحالي (جلسة Cloud Agent)

> هذا الرابط مؤقت من Cloudflare Quick Tunnel ويتوقف عند إيقاف السيرفر أو الجلسة.

| البند | القيمة |
|--------|--------|
| **الرابط العام** | https://olive-alberta-biographies-citizenship.trycloudflare.com |
| تسجيل الدخول | https://olive-alberta-biographies-citizenship.trycloudflare.com/login |
| **إنشاء حساب** (يعمل مباشرة — أول حساب = مدير النظام) | https://olive-alberta-biographies-citizenship.trycloudflare.com/register |
| إعداد بديل | https://olive-alberta-biographies-citizenship.trycloudflare.com/setup |
| لوحة التحكم | https://olive-alberta-biographies-citizenship.trycloudflare.com/dashboard/dashboard |

## إعادة تشغيل الرابط

```bash
npm run build
fuser -k 3000/tcp 2>/dev/null || true
npm run start -- -H 0.0.0.0 -p 3000
# في طرفية ثانية:
cloudflared tunnel --url http://127.0.0.1:3000
```

أو: `npm run tunnel` (يبني ويشغّل ويحدّث `.env.local`).

## للإنتاج الدائم (VPS)

راجع `docs/DEPLOY_PUBLIC_URL.md` — PM2 + Nginx + SSL + `NEXT_PUBLIC_APP_URL=https://app.your-domain.com`
