
# خطة التطوير الشاملة لتطبيق Advance

## نظرة عامة
هذه الخطة تتضمن 13 تحديثاً رئيسياً للتطبيق تشمل: تحسين نظام الباقات، إعادة هيكلة واجهة المستخدم، إضافة نظام العروض الترويجية، تحسين التوجيه، وإصلاح أخطاء تسجيل الدخول.

---

## 1. إصلاح خطأ تسجيل الدخول برقم الهاتف (أولوية عليا)

**المشكلة**: الـ Edge Function `phone-login` يتطلب secret باسم `SUPABASE_PUBLISHABLE_KEY` غير موجود.

**الحل**:
- تعديل Edge Function لاستخدام `SUPABASE_ANON_KEY` بدلاً من `SUPABASE_PUBLISHABLE_KEY` (متوفر تلقائياً)

**الملفات المتأثرة**:
- `supabase/functions/phone-login/index.ts`

---

## 2. إيقاف باقة المبتدئ تلقائياً بعد 7 أيام

**التفاصيل**:
- المهام اليومية وعجلة الحظ فقط تتوقف تلقائياً
- باقي الميزات تبقى متاحة
- يمكن للإدارة إعادة التفعيل يدوياً

**التنفيذ**:
- تعديل `DailyTasks.tsx` للتحقق من `trial_end_date`
- تعديل `LuckyWheel` للتحقق من انتهاء التجربة
- إضافة رسالة توضيحية للمستخدم

**الملفات المتأثرة**:
- `src/components/DailyTasks.tsx`
- `src/pages/Index.tsx` (قسم المهام وعجلة الحظ)

---

## 3. نقل بطاقة الرصيد من الرئيسية إلى المحفظة

**التفاصيل**:
- إزالة `BalanceCard` من الشاشة الرئيسية
- إضافتها في قسم المحفظة فقط

**الملفات المتأثرة**:
- `src/pages/Index.tsx`

---

## 4. نظام إرسال روابط عبر الإشعارات (لوحة الإدارة)

**التفاصيل**:
- إضافة حقل اختياري للرابط في نموذج إرسال الإشعارات
- الرابط يظهر كزر قابل للنقر في الإشعار
- دعم الروابط الداخلية والخارجية

**الملفات المتأثرة**:
- `src/components/admin/AdminNotificationsTab.tsx`
- `src/components/notifications/NotificationBell.tsx`

**تحديث قاعدة البيانات**:
- إضافة عمود `link` إلى جدول `notifications`

---

## 5. قسم العروض في لوحة التحكم + واجهة المستخدم

**التفاصيل**:
- إنشاء جدول `promotions` جديد في قاعدة البيانات
- تبويب جديد في لوحة الإدارة لإدارة العروض
- دعم الخط العريض والعادي والألوان
- أزرار تشغيل/إيقاف/حذف لكل عرض
- عرض العروض النشطة فقط في واجهة المستخدم

**الملفات الجديدة**:
- `src/components/admin/AdminPromotionsTab.tsx`

**الملفات المتأثرة**:
- `src/pages/Admin.tsx`
- `src/components/OffersPage.tsx`

**تحديث قاعدة البيانات**:
```sql
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_style JSONB DEFAULT '{}',
  image_url TEXT,
  link_url TEXT,
  link_type TEXT DEFAULT 'internal',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);
```

---

## 6. بانرات ترويجية في الصفحة الرئيسية

**التفاصيل**:
- كاروسيل للعروض الترويجية في أعلى الصفحة الرئيسية
- يعرض العروض النشطة فقط
- كل عرض قابل للنقر مع رابط مخصص
- التحكم الكامل من لوحة الإدارة

**الملفات الجديدة**:
- `src/components/PromotionBanner.tsx`

**الملفات المتأثرة**:
- `src/pages/Index.tsx`

---

## 7. تبسيط القائمة الجانبية

**التفاصيل**:
- حذف جميع الأزرار ما عدا زر تسجيل الخروج
- إزالة زر تسجيل الدخول/الخروج من أعلى يسار الشاشة
- نقل زر الإشعارات إلى مكانه

**الملفات المتأثرة**:
- `src/components/AppSidebar.tsx`
- `src/pages/Index.tsx`

---

## 8. نظام توجيه ذكي (URL Routing)

**التفاصيل**:
- مسار URL منفصل لكل صفحة:
  - `/app` - الرئيسية
  - `/app/tasks` - المهام
  - `/app/wallet` - المحفظة
  - `/app/team` - الفريق
  - `/app/packages` - الباقات
  - `/app/ads` - الإعلانات
  - `/app/offers` - العروض
  - `/app/profile` - الملف الشخصي
  - `/app/sponsor` - ممول
  - `/app/support` - الدعم
- تحديث الرابط تلقائياً عند التنقل
- حماية الصفحات للمستخدمين غير المسجلين
- دعم المشاركة المباشرة للصفحات

**الملفات المتأثرة**:
- `src/App.tsx`
- `src/pages/Index.tsx` (تحويل لـ layout مع outlet)

**الملفات الجديدة**:
- `src/components/ProtectedRoute.tsx`
- `src/pages/app/Home.tsx`
- `src/pages/app/Tasks.tsx`
- `src/pages/app/Wallet.tsx`
- (وهكذا لكل صفحة)

---

## 9. نظام النقاط في المحفظة

**التفاصيل**:
- عرض عدد النقاط للمستخدم
- كل 1000 نقطة = 165 جنيه
- توضيح هذه المعادلة للمستخدم بشكل واضح

**الملفات المتأثرة**:
- `src/pages/Index.tsx` (قسم المحفظة)

**تحديث قاعدة البيانات**:
- إضافة عمود `points` إلى جدول `profiles`

---

## 10. تحسين أزرار مراجعة الإعلانات (لوحة الإدارة)

**التفاصيل**:
- إضافة أزرار واضحة: قيد المراجعة، منشور، مرفوض، حذف
- تحسين واجهة المراجعة

**الملفات المتأثرة**:
- `src/components/admin/AdminAdsTab.tsx`

---

## 11. تحديث الألوان لتكون أكثر إشراقاً

**التفاصيل**:
- تحسين ألوان CSS مع الحفاظ على الهوية الحالية
- زيادة التباين والحيوية

**الملفات المتأثرة**:
- `src/index.css`
- `tailwind.config.ts`

---

## 12. تحسين الخطوط والنصوص

**التفاصيل**:
- تكبير العناوين الرئيسية
- تحسين قراءة النصوص الصغيرة
- توحيد أحجام الخطوط

**الملفات المتأثرة**:
- `src/index.css`
- مكونات UI المختلفة

---

## 13. إغلاق الإشعارات عند لمس أطراف الشاشة

**التفاصيل**:
- تحسين UX لقائمة الإشعارات
- الإغلاق عند النقر خارج القائمة

**الملفات المتأثرة**:
- `src/components/notifications/NotificationBell.tsx`

---

## التفاصيل التقنية

### تحديثات قاعدة البيانات المطلوبة

```sql
-- 1. إضافة عمود الرابط للإشعارات
ALTER TABLE notifications ADD COLUMN link TEXT;

-- 2. إضافة عمود النقاط للملفات الشخصية
ALTER TABLE profiles ADD COLUMN points INTEGER DEFAULT 0;

-- 3. جدول العروض الترويجية
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_style JSONB DEFAULT '{}',
  image_url TEXT,
  link_url TEXT,
  link_type TEXT DEFAULT 'internal',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- سياسات الأمان
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active promotions"
  ON promotions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage promotions"
  ON promotions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- تفعيل Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE promotions;
```

### هيكل الملفات الجديد

```text
src/
├── components/
│   ├── PromotionBanner.tsx (جديد)
│   └── admin/
│       └── AdminPromotionsTab.tsx (جديد)
├── pages/
│   └── app/
│       ├── Home.tsx (جديد)
│       ├── Tasks.tsx (جديد)
│       ├── Wallet.tsx (جديد)
│       ├── Team.tsx (جديد)
│       ├── Packages.tsx (جديد)
│       ├── Ads.tsx (جديد)
│       ├── Offers.tsx (جديد)
│       ├── Profile.tsx (جديد)
│       ├── Sponsor.tsx (جديد)
│       └── Support.tsx (جديد)
```

---

## ترتيب التنفيذ المقترح

1. **إصلاح تسجيل الدخول** (أولوية قصوى - يمنع استخدام التطبيق)
2. **تحديثات قاعدة البيانات** (أساس للميزات الجديدة)
3. **نظام التوجيه الذكي** (إعادة هيكلة كبيرة)
4. **تبسيط القائمة الجانبية ونقل الإشعارات**
5. **نقل الرصيد للمحفظة وإضافة النقاط**
6. **نظام العروض الترويجية**
7. **البانرات الترويجية**
8. **تحسين الألوان والخطوط**
9. **باقي التحسينات**

---

## ملاحظات مهمة

- جميع التغييرات متوافقة مع شاشات الهاتف والكمبيوتر
- الحفاظ على استقرار التطبيق الحالي
- دعم التوسع المستقبلي
