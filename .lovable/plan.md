# خطة التنفيذ الشاملة

## 1. تعديل لعبة بيت الأشباح
- في `HauntedHouseGame.tsx`: تقليل مدة ظهور الشبح الحقيقي إلى **1100ms** (بدلًا من القيمة الحالية)
- إعادة تشويش (shuffle) `GHOST_SPOTS` في بداية كل جولة لضمان تجديد الأماكن
- إضافة `AdminGamesTab` إعداد `real_ghost_duration_ms` قابل للتعديل (اختياري)

## 2. إخفاء أيقونات من الواجهة (بنية جاهزة)
- إضافة حقل `hidden_home_icons: string[]` داخل `app_settings` (JSON)
- في `HomeGrid.tsx` و `Navigation.tsx`: قراءة القائمة وتصفية الأيقونات المخفية
- إضافة تبويب في لوحة الإدارة `AdminAppSettingsTab` لتفعيل/إخفاء كل أيقونة (checkbox list)
- **ملاحظة:** لا يتم حذف الكود، فقط الإخفاء البصري

## 3. تحويل إعدادات التطبيق إلى صفحة مستقلة
- إنشاء `src/pages/Settings.tsx` بمسار `/settings`
- نقل محتوى `ProfileSettings.tsx` الحالي إلى صفحة كاملة
- إضافة أقسام جديدة:
  - **زر "التحقق من إصدار جديد"** يستدعي `detect-app-version` ويعرض النتيجة
  - **قسم "سياسة الخصوصية"** يعرض `PrivacyPolicyModal` كمحتوى قابل للقراءة
  - **قسم "المظهر"** (Light/Dark/System) عبر `next-themes` أو حل مخصص، يُحفظ في `profiles.theme_preference`
- تحديث `ProfileSection.tsx`: زر الترس ينقل إلى `/settings` بدلًا من فتح Dialog

## 4. حذف أيقونة الرئيسية من شريط التنقل
- في `Navigation.tsx`: حذف عنصر `home` من مصفوفة tabs
- التأكد أن `Index.tsx` يبدأ بـ `activeTab = "home"` افتراضيًا
- التنقل يعود للرئيسية عند الضغط على الشعار العلوي أو زر رجوع

## 5. إعادة تصميم مركز الألعاب بأيقونات دائرية
- في `GamesCenter.tsx`: استبدال البطاقات المستطيلة بشبكة (grid-cols-3) مطابقة لتصميم `HomeGrid`
- كل لعبة = أيقونة دائرية متدرجة + label + وصف قصير
- الحفاظ على `GAMES` registry للتوسع المستقبلي

## 6. تفعيل فترة تجربة 7 أيام للباقة المجانية
- الحقل موجود بالفعل: `profiles.trial_end_date` (يُحدد عند `handle_new_user`)
- إضافة hook `useTrialStatus()` يتحقق: `trial_end_date < now() && account_type = 'beginner'`
- حجب الوصول عن: المهام، الألعاب، العروض التي تتطلب اشتراك
- عرض بانر "انتهت الفترة التجريبية — قم بالترقية" مع زر توجيه إلى `packages`
- **عدم حذف البيانات أو الرصيد**

## 7. نظام الأوسمة (Badges)
- **جدول جديد** `badges`: name, icon, color, description
- **جدول جديد** `user_badges`: user_id, badge_id, granted_at, granted_by
- تبويب إدارة جديد `AdminBadgesTab.tsx`: إنشاء أوسمة، منح/سحب من أي مستخدم
- عرض الوسام في `ProfileSection` و بطاقة العضوية

## 8. بطاقة عضوية رقمية
- مكون جديد `MembershipCard.tsx` داخل `ProfileSection`
- تصميم بطاقة أفقية بتدرج ذهبي (شبيه بطاقة بنكية) يحتوي:
  - صورة (`avatar_url` أو شعار A Pro)
  - الاسم، ID، الباقة، الوسام الحالي، تاريخ الانضمام (`created_at`)
- تصميم قابل للمشاركة/تحميل مستقبلًا

## 9. صورة افتراضية = شعار A Pro
- في كل `Avatar`: `AvatarImage src={avatar_url || '/a-pro-logo.png'}`
- عند الحذف: تُعاد إلى الشعار تلقائيًا (فقط بمسح `avatar_url` = null)

## التغييرات على قاعدة البيانات (Migration)
```sql
ALTER TABLE profiles ADD COLUMN theme_preference TEXT DEFAULT 'system';
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT DEFAULT '#FFD700',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- + GRANTs + RLS (كل المستخدمين يقرؤون، admin يكتب)

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID,
  UNIQUE(user_id, badge_id)
);
-- + GRANTs + RLS

-- app_settings row جديد: hidden_home_icons = []
```

## الملفات الجديدة
- `src/pages/Settings.tsx`
- `src/components/profile/MembershipCard.tsx`
- `src/components/admin/AdminBadgesTab.tsx`
- `src/hooks/useTrialStatus.tsx`
- `src/hooks/useTheme.tsx`
- `src/lib/hiddenIcons.ts`
- `public/a-pro-logo.png` (يتم توليده)

## الملفات المعدّلة
- `HauntedHouseGame.tsx`, `HomeGrid.tsx`, `Navigation.tsx`, `GamesCenter.tsx`
- `ProfileSection.tsx`, `App.tsx` (route جديد)
- `AdminAppSettingsTab.tsx`, `Admin.tsx` (إضافة تبويب Badges)

هل تريد المتابعة بالتنفيذ الكامل؟
