
# خطة التحديث الشامل للتطبيق

سأنفذ التحديث على 6 محاور مع الحفاظ التام على جميع الأنظمة الحالية.

---

## 1) الهوية: A Pro كاختصار رسمي
- إضافة شعار مختصر **A Pro** بجانب/بدل الاسم الكامل *Advance* في:
  - الشريط العلوي، القائمة الجانبية، شاشة البداية (Splash)، أيقونة PWA (manifest short_name)، صفحة الهبوط، الفوتر.
- الاحتفاظ بـ **Advance** كاسم رسمي كامل في: عنوان المتصفح، صفحات SEO، الفواتير، رسائل تليجرام، صفحة "من نحن".
- تحديث `manifest.json` → `"name": "Advance"`, `"short_name": "A Pro"`.

## 2) تطوير الواجهة (Frontend فقط)
- تحويل جميع الأيقونات (Home Grid, Sidebar, Cards, Buttons, Avatars) إلى **دائرية** عبر تحديث `rounded-2xl/xl` → `rounded-full` في مكونات الأيقونات فقط (وليس البطاقات الكبيرة).
- تحسين نظام الحركة: انتقالات صفحات ناعمة (`fade-in + scale-in`) عبر Suspense wrapper، ظلال متدرجة، hover-scale موحد.
- تحسين الخطوط: تدرج أوزان Tajawal، spacing أفضل.
- **لا يتم لمس أي منطق أعمال أو نداءات API**.

## 3) إخفاء قسم "الجديد" من الواجهة الأمامية
- **إخفاء فقط، بدون حذف**:
  - إزالة بطاقة "الجديد" من `HomeGrid.tsx` (تعليقها أو flag).
  - إزالة رابط `/app/updates` من `AppSidebar`/`Navigation`.
  - إبقاء المسار `<Route path="/app/updates">` يعمل + `UpdatesFeed` + `AdminUpdatesTab` + جدول `update_posts` + كل الـ Edge Functions.
- إضافة flag في `app_settings`: `updates_visible_to_users = false` لسهولة إعادة التفعيل لاحقًا من الأدمن.

## 4) مركز الألعاب (قسم جديد قابل للتوسع)
- صفحة جديدة `/app/games` باسم **مركز الألعاب**.
- بطاقة في `HomeGrid` تفتحها (مكان "الجديد").
- بنية قابلة للتوسع: `src/components/games/` + registry pattern `games.ts` (id, title, cover, component, enabled).
- عرض الألعاب المتاحة من `app_settings` أو جدول `games` (سنستخدم `app_settings` لتبسيط المرحلة الأولى).

## 5) لعبة "بيت الأشباح" 👻
- ملف `src/components/games/HauntedHouse/`:
  - `HauntedHouseGame.tsx` — منطق اللعبة
  - `Tutorial.tsx` — تظهر مرة واحدة (localStorage flag `ghost_tutorial_seen`)
  - `WinScreen.tsx` / `LoseScreen.tsx`
  - `ghostSpots.ts` — مصفوفة إحداثيات (%) لأماكن ظهور طبيعية (أبواب، نوافذ، خلف أثاث، أعلى السلالم)
- خلفية: صورة **منزل مهجور احترافي** مولدة عبر imagegen (premium).
- منطق اللعبة:
  - عداد تنازلي 90 ثانية (قابل للتعديل من الأدمن).
  - هدف افتراضي 5 أشباح (قابل للتعديل).
  - شبح يظهر في مكان عشوائي لمدة `<1s`، يختفي إن لم يُمسك.
  - **تصاعد الصعوبة**: فترة الظهور تنقص كل 15 ثانية.
  - بعد نصف الوقت: احتمال ظهور **شبحين معًا** — أحدهما حقيقي (يُحتسب) والآخر وهمي (لا يُحتسب، يُضيء بلون مختلف قليلًا).
  - عداد `caught/target` ظاهر دومًا.
  - **RNG جديد كل جولة** — لا يوجد ترتيب محفوظ.
- شاشة فوز/خسارة احترافية مع زر إعادة.
- **جاهز للربط بنظام رهان مستقبلًا** عبر props `onWin(caught, timeUsed)` بدون تنفيذه الآن.

## 6) قسم الألعاب في لوحة الإدارة
- تبويب جديد `AdminGamesTab.tsx`:
  - قائمة الألعاب (حاليًا: بيت الأشباح).
  - لكل لعبة: تشغيل/إيقاف، إعدادات خاصة.
  - لبيت الأشباح: `enabled`, `target_ghosts`, `duration_seconds`, `spawn_speed_multiplier`, `fake_ghosts_enabled`, `tutorial_enabled`.
- تُخزَّن الإعدادات في `app_settings` تحت مفتاح `games_config` (JSON) — لا حاجة لجداول جديدة.
- إيقاف اللعبة لا يحذف بياناتها.

## 7) إصلاح "نسيت كلمة المرور" بالكامل
مراجعة `request-password-reset` edge function:
- **السبب الأرجح للفشل الحالي**: قد لا يوجد صف في `profiles` بنفس البريد (case-sensitivity)، أو `telegram_chat_id` قد يكون `bigint` والاستعلام يعالجه كنص.
- إصلاحات:
  1. البحث case-insensitive: `.ilike('email', email)` بدل `.eq()`.
  2. رسائل خطأ **حقيقية ومفصّلة** (email_not_found, telegram_not_linked, telegram_send_failed مع نص خطأ تليجرام الحرفي).
  3. تسجيل كل محاولة في `notification_delivery_logs` بقناة `password_reset` (نجاح/فشل + السبب).
  4. عرض السبب الحقيقي في `ForgotPasswordDialog`.
  5. عدم الانتقال لخطوة كلمة المرور الجديدة إلا بعد التحقق الفعلي من الرمز عبر edge function (خطوة verify منفصلة قبل reset) — حاليًا التحقق يتم فقط عند submit، سنضيف نداء `verify-reset-code` قبل شاشة كلمة المرور.
- إضافة تبويب في الأدمن (أو قسم داخل Diagnostics) لعرض سجل محاولات إعادة التعيين.

---

## الملفات المتأثرة (تقديري)

**جديد:**
- `src/pages/GamesCenter.tsx`
- `src/components/games/registry.ts`
- `src/components/games/HauntedHouse/{HauntedHouseGame,Tutorial,WinScreen,LoseScreen,ghostSpots}.tsx`
- `src/assets/haunted-house-bg.jpg` (imagegen)
- `src/assets/ghost.png` (imagegen, transparent)
- `src/components/admin/AdminGamesTab.tsx`
- `supabase/functions/verify-reset-code/index.ts`

**تعديل:**
- `index.html`, `public/manifest.json` (A Pro short_name)
- `src/components/HomeGrid.tsx` (إخفاء "الجديد" + إضافة "مركز الألعاب")
- `src/components/AppSidebar.tsx`, `Navigation.tsx` (إزالة رابط الجديد، إضافة الألعاب، شعار A Pro)
- `src/App.tsx` (route `/app/games`)
- `src/index.css` / `tailwind.config.ts` (rounded-full utilities، transitions)
- `src/components/ForgotPasswordDialog.tsx` (رسائل خطأ حقيقية + خطوة verify)
- `supabase/functions/request-password-reset/index.ts` (ilike + logs + تفصيل)
- `src/components/admin/*Tab.tsx` (تسجيل التبويب الجديد)
- `src/pages/Admin.tsx`

**لا تغيير على قواعد البيانات** — كل الإعدادات عبر `app_settings` الموجود، والسجلات عبر `notification_delivery_logs` الموجود.

---

هل أبدأ التنفيذ؟
