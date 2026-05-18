## نظام المسابقات الموسمية الاحترافي

نظام مسابقات بمستويات متدرجة، عناوين موسمية مرنة، مكافآت، ومستويات مفاجأة — متاح لمستخدمي VIP فقط.

---

### 1. قاعدة البيانات (جداول جديدة)

**`contests`** — المسابقة الموسمية
- `title` (يكتبه الأدمن، مثل "مسابقة العيد")
- `subtitle`, `description`, `banner_url`
- `starts_at`, `ends_at` (إغلاق تلقائي عند الانتهاء)
- `target_audience` (vip1, vip2, vip3, all_vip)
- `total_levels` (مثلاً 20)
- `questions_per_level` (افتراضي 5)
- `surprise_every` (افتراضي 5 — كل 5 مستويات صندوق مفاجأة)
- `is_active`, `show_on_home`, `show_on_offers`

**`contest_questions`**
- `contest_id`, `level_number`, `order_in_level`
- `category` (تاريخ/جغرافيا/أدب/فنون/أفلام/مسلسلات/تكنولوجيا/علوم...)
- `question_text`, `correct_answer`, `wrong_answers` (jsonb بـ 3 إجابات)
- `difficulty`

**`contest_rewards`** — مكافآت صناديق المفاجأة لكل عتبة
- `contest_id`, `at_level` (5, 10, 15...)
- `reward_type`: `points` | `balance` | `vip_upgrade_temp` | `discount_percent` | `custom`
- `reward_value` (jsonb: مثلاً `{percent:3, days:7}` أو `{from:"vip1", to:"vip2", days:3}`)
- `title`, `icon`

**`contest_progress`** — تقدم المستخدم (يحفظ تلقائياً)
- `contest_id`, `user_id`
- `current_level`, `completed_levels` (int[])
- `current_question_index` (للاستئناف داخل المستوى)
- `correct_count`, `wrong_count`
- `claimed_rewards` (int[] — عتبات تم استلام مكافأتها)
- `started_at`, `last_played_at`, `finished_at`

**`contest_answers`** — سجل إجابات (للتاريخ والإحصاء)
- `contest_id`, `user_id`, `question_id`, `selected_index`, `is_correct`, `answered_at`

RLS: المستخدمون يقرؤون المسابقات النشطة، يديرون تقدمهم وإجاباتهم. الأدمن يدير كل شيء.

دالة `claim_contest_reward(contest_id, level)` SECURITY DEFINER — تطبّق المكافأة (تحدّث الرصيد/النقاط/الباقة المؤقتة) وتسجّلها في `claimed_rewards` و`activity_logs`.

ترقية مؤقتة: نضيف عمود `temp_vip_until` و`temp_vip_type` على `profiles` يقرأها منطق الباقات.

---

### 2. لوحة الإدارة — تبويب جديد "المسابقات"

`AdminContestsTab.tsx`:
- إنشاء/تعديل مسابقة (عنوان حر، رفع بانر، تواريخ، فئة مستهدفة، عدد مستويات، عتبة المفاجأة)
- محرر الأسئلة: إضافة سؤال (نص + 4 إجابات + تحديد الصحيحة + تصنيف + مستوى)
- استيراد جماعي JSON للأسئلة
- محرر المكافآت لكل عتبة
- عرض سجل المشاركين والمستوى الذي وصلوه

---

### 3. واجهة المستخدم

**`ContestBanner.tsx`** — بانر احترافي مع عداد تنازلي (أيام/ساعات/دقائق/ثوانٍ) يظهر:
- في `HomeGrid` إذا `show_on_home`
- في `OffersPage` إذا `show_on_offers`
- يفتح صفحة `/app/contest/:id`

**`ContestPage.tsx`** — صفحة المسابقة:
- شاشة الترحيب: البانر، الوصف، العداد، شريط تقدم (مستوى X من Y)، خريطة المستويات (دوائر مع علامات استفهام للمفاجأة كل 5)
- التحقق من VIP و`target_audience` و`ends_at > now()`
- زر "ابدأ" / "تابع المستوى X"

**`ContestLevel.tsx`** — لعب المستوى:
- 5 أسئلة متتالية، 4 أزرار إجابة
- **خلط الإجابات عشوائياً** (Fisher-Yates) في كل مرة بـ seed مبني على `question_id + attempt` كي لا تُحفظ الأماكن
- حفظ التقدم بعد كل سؤال (`current_question_index`)
- خطأ واحد = إعادة المستوى من البداية، نجاح كامل = فتح المستوى التالي
- مؤثرات: framer-motion shake عند الخطأ، confetti عند إكمال المستوى

**`SurpriseBox.tsx`** — صندوق المفاجأة كل 5 مستويات:
- علامة استفهام ذهبية متحركة، نقر = فتح بانيميشن، عرض المكافأة (نقاط/خصم/ترقية مؤقتة)
- استدعاء `claim_contest_reward` RPC
- confetti + صوت احتفالي

**نهاية المسابقة** — شهادة فوز + ملخص النتائج + مشاركة.

---

### 4. التوافق مع الذاكرة

- RTL/Tajawal، Premium Dark + ذهبي، 12h time، Arabic UI ✔
- لا أسماء موسمية ثابتة في الكود — العنوان والبانر يكتبه الأدمن (كما في `update_label`) ✔
- VIP-only (يحترم قاعدة "Live chat VIP1-3") ✔
- realtime على جدول `contests` لظهور فوري عند التفعيل

---

### الملفات المضافة/المعدّلة

جديد:
- migration للجداول الخمسة + RPC + عمود `temp_vip_until`
- `src/components/contest/ContestBanner.tsx`
- `src/pages/ContestPage.tsx`
- `src/components/contest/ContestLevel.tsx`
- `src/components/contest/SurpriseBox.tsx`
- `src/components/contest/LevelMap.tsx`
- `src/hooks/useContest.tsx`
- `src/components/admin/AdminContestsTab.tsx`

معدّل:
- `src/App.tsx` (route للمسابقة)
- `src/pages/Admin.tsx` (تبويب جديد)
- `src/components/HomeGrid.tsx` + `OffersPage.tsx` (إدراج البانر)

---

هل أبدأ التنفيذ بهذا الشكل؟ أو تريد تعديلاً (مثلاً: السماح بمحاولات متعددة قبل إعادة المستوى، أو إتاحته لكل المستخدمين وليس VIP فقط)؟
