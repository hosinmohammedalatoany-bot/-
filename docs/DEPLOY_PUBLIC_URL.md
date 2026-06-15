# نشر النظام على رابط عام — Baraa Raed

## متطلبات

- Node.js 20+
- المنفذ 3000 مفتوح على السيرفر (أو عبر Nginx)
- لا يوجد `localhost` ثابت في الكود — استخدم `NEXT_PUBLIC_APP_URL`

## تشغيل سريع (نفق مؤقت — مثل النظام القديم)

```bash
cd /path/to/workspace
npm install
npm run build
npm run tunnel
```

سيظهر رابط مثل: `https://xxxx.trycloudflare.com`

انسخه إلى `.env.local`:

```env
NEXT_PUBLIC_APP_URL=https://xxxx.trycloudflare.com
VERIFY_EMAIL_IN_RESPONSE=true
```

أعد تشغيل التطبيق بعد تغيير `.env.local` حتى تُستخدم الروابط الصحيحة في التسجيل واستعادة كلمة المرور.

## تشغيل إنتاج على VPS

```bash
npm ci
npm run build
cp .env.example .env.production.local
# عدّل NEXT_PUBLIC_APP_URL=https://app.your-domain.com

pm2 start ecosystem.config.cjs --env production
pm2 save
```

ضع Nginx أمام التطبيق (`deploy/nginx.conf.example`) وفعّل SSL:

```bash
sudo certbot --nginx -d app.your-domain.com
```

## متغيرات البيئة

| المتغير | الوصف |
|---------|--------|
| `NEXT_PUBLIC_APP_URL` | الرابط العام للواجهة (HTTPS) |
| `VERIFY_EMAIL_IN_RESPONSE` | `true` لإظهار رابط التحقق في JSON عند عدم وجود بريد |
| `PORT` | منفذ الاستماع (افتراضي 3000) |
| `HOSTNAME` | `0.0.0.0` للوصول من الشبكة |

## مسارات مهمة

- `/setup` — أول مدير عام (مرة واحدة)
- `/login` — تسجيل الدخول
- `/register` — حساب جديد (تفعيل مباشر وتسجيل دخول تلقائي)
- `/dashboard/dashboard` — لوحة التحكم
- `/dashboard/cars` — السيارات (مثال قسم)

## اختبار من جهاز خارجي

1. افتح الرابط العام من iPhone Safari أو Android Chrome.
2. سجّل الدخول أو أنشئ الإعداد الأول.
3. تأكد أن القائمة الجانبية تفتح قسماً واحداً في كل مرة.
4. جرّب طباعة من قسم المبيعات أو التقارير — لا صفحة بيضاء.

## ملاحظة Cloud Agent

في بيئة Cursor Cloud، استخدم `npm run tunnel` واحفظ الرابط المعروض. النفق يتوقف عند إيقاف الجلسة؛ للإنتاج الدائم استخدم VPS + PM2 + Nginx.
