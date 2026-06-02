# الوصول العام الحالي — Baraa Raed

آخر تحديث: 2026-05-31

| الاستخدام | الرابط |
|-----------|--------|
| **الرابط العام (نشط الآن)** | https://shannon-ran-envelope-feeding.trycloudflare.com |
| تسجيل الدخول | https://shannon-ran-envelope-feeding.trycloudflare.com/login |
| **إنشاء حساب** (أول حساب = مدير النظام) | https://shannon-ran-envelope-feeding.trycloudflare.com/register |
| إعداد بديل | https://shannon-ran-envelope-feeding.trycloudflare.com/setup |
| لوحة التحكم | https://shannon-ran-envelope-feeding.trycloudflare.com/dashboard/dashboard |

## روابط سابقة (منتهية)

- `https://systematic-highly-www-literacy.trycloudflare.com` → انتهى بعد إيقاف النفق
- `https://action-evident-bon-amendment.trycloudflare.com` → منتهي
- `https://restore-heater-church-reservoir.trycloudflare.com` → انتهى بعد إعادة البناء
- `https://automatic-newer-comparisons-fed.trycloudflare.com` → انتهى / DNS لا يعمل
- `https://feeds-collectibles-part-more.trycloudflare.com` → `ERR_FAILED`
- `https://tumor-harvey-legislative-abraham.trycloudflare.com` → خطأ تطبيق (ملفات JS قديمة)

## تشغيل محلي

```bash
npm run build
HOSTNAME=0.0.0.0 PORT=3000 npm run start
# http://127.0.0.1:3000
```

## تشغيل مع نفق عام

```bash
npm run tunnel
# أو: PORT=3000 bash scripts/start-tunnel.sh
```

انسخ الرابط الجديد من مخرجات `cloudflared` (سطر `trycloudflare.com`).
