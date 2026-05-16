## نظام التحديثات الإجباري داخل التطبيق

### نظرة عامة
نظام احترافي لإدارة إصدارات التطبيق يفحص الإصدار عند الفتح ويُجبر المستخدم على المرور بالتحديثات بالتسلسل. بما أن التطبيق PWA على الويب، "التحديث" = إعادة تحميل لجلب أحدث نسخة من الخادم (مع تنظيف الـ Service Worker cache).

### 1. قاعدة البيانات — جدول `app_versions`
حقول رئيسية:
- `version` (نص، مثل "1.2.0") + `version_code` (رقم تسلسلي للمقارنة)
- `title`, `description`
- `features` (JSONB) — قائمة [{icon, label, badge: 'new'|'feature'|'fix', description}]
- `images` (نص[]) — سلايدر صور للميزات
- `is_mandatory` (bool) — تحديث إجباري كامل أم خفيف
- `target_audience` (نص) — 'all' | 'vip1' | 'vip2' | 'vip3' | 'beginner'
- `theme` (نص) — 'default' | 'ramadan' | 'eid' | 'celebration' (لتغيير ألوان الشاشة)
- `release_date`, `is_active`
- RLS: الكل يقرأ، الإدمن فقط يكتب

### 2. ثابت الإصدار في الكود
ملف `src/lib/appVersion.ts` يحتوي `CURRENT_VERSION_CODE` يُحدّث يدوياً مع كل إصدار. يُحفظ آخر إصدار رآه المستخدم في `localStorage`.

### 3. منطق الفحص — `useAppVersion` hook
- يجلب كل الإصدارات النشطة الأحدث من إصدار المستخدم الحالي مرتبة تصاعدياً
- يفلتر حسب نوع حساب المستخدم (`target_audience`)
- يعرض أول إصدار غير مرئي بالتسلسل
- بعد إقرار المستخدم: يحفظ في localStorage وينتقل للتالي حتى يصل لأحدث إصدار

### 4. شاشة التحديث `UpdateScreen.tsx`
تظهر فوق كل شيء (overlay كامل، z-index عالي، blur خلفية):
- عنوان "يوجد إصدار جديد متوفر" مع رقم الإصدار القديم → الجديد
- سلايدر صور (Embla) للميزات البصرية
- قائمة الميزات بأيقونات + شارات (جديد / ميزة قوية / إصلاح)
- زر "تحديث الآن" بارز + شريط تقدم أثناء التحديث
- إذا `is_mandatory=false`: زر "لاحقاً" متاح؛ إذا `true`: لا مهرب
- تغيير الألوان حسب `theme` (رمضان=أخضر/ذهبي، عيد=بنفسجي، إلخ)

### 5. عملية التحديث
عند الضغط على "تحديث الآن":
1. شريط تقدم متحرك
2. تسجيل الإصدار في localStorage
3. `caches.keys().then(keys => keys.forEach(k => caches.delete(k)))` لتنظيف PWA cache
4. `navigator.serviceWorker.getRegistrations()` → `unregister()` للـ SW القديم
5. `window.location.reload(true)`

### 6. التكامل مع التطبيق
إضافة `<UpdateGate>` في `App.tsx` يلف الـ Routes ويعرض UpdateScreen عند الحاجة.

### 7. تبويب إدارة الإصدارات — `AdminVersionsTab.tsx`
داخل `/admin`:
- جدول بكل الإصدارات
- نموذج إضافة/تعديل: حقول + محرر ميزات ديناميكي (إضافة/حذف صف) + رفع صور لـ bucket مخصص
- تبديل `is_mandatory`, `is_active`, اختيار `target_audience` و `theme`

### تفاصيل تقنية
- لا حاجة لـ edge function — كل شيء عبر Supabase client مع RLS
- bucket جديد `version-images` للصور التوضيحية (عام)
- مقارنة الإصدارات بـ `version_code` (integer) لتفادي مشاكل semver النصية
- التسلسل: لو المستخدم على version_code=3 وأحدث 5، يرى 4 ثم 5
