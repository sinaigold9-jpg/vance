import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, ChevronUp, Crown, Wallet, Users, Gift, Target, Shield, MessageSquare, Zap, Megaphone, IdCard } from "lucide-react";
import { BackButton } from "./BackButton";

interface FAQItem {
  id: string;
  icon: React.ReactNode;
  question: string;
  answer: string;
}

// ثوابت مركزية — عدّل هنا مرة واحدة بدل البحث عنها في كل إجابة
const WALLET_NUMBER = "01080048591";
const PAYMENT_GATEWAYS = "فودافون كاش، اتصالات كاش (We)، أورنج كاش";

const faqData: FAQItem[] = [
  {
    id: "packages",
    icon: <Crown className="w-5 h-5" />,
    question: "ما هي الباقات المتاحة وما الفرق بينها؟",
    answer: `يوفر التطبيق أربع باقات مختلفة لتناسب جميع المستخدمين:

- باقة المبتدئ (مجانية): تجربة شاملة لمدة 7 أيام مع 3 مهام يومية ومكافأة 3 جنيه لكل مهمة. رصيد افتتاحي 50 جنيه. بعد انتهاء التجربة يجب الترقية لباقة VIP لمتابعة الربح.

- باقة VIP 1 (500 جنيه): 3 مهام يومية بمكافأة 15 جنيه لكل مهمة، عجلة حظ يومية، ودعم عبر التذاكر.

- باقة VIP 2 (850 جنيه): 3 مهام يومية بمكافأة 25 جنيه لكل مهمة، عجلة حظ يومية، ومحادثة مباشرة مع الدعم الفني.

- باقة VIP 3 (1500 جنيه): 3 مهام يومية بمكافأة 35 جنيه لكل مهمة، عجلة حظ يومية، محادثة مباشرة مع الدعم، وأولوية في المعالجة.

ملاحظة: الترقية تتم بتحويل المبلغ لرقم ${WALLET_NUMBER} ورفع إيصال الدفع، ويتم التفعيل من الإدارة بعد المراجعة.`
  },
  {
    id: "tasks",
    icon: <Target className="w-5 h-5" />,
    question: "كيف أربح من المهام اليومية؟",
    answer: `المهام اليومية هي المصدر الأساسي للربح في التطبيق:

1. ادخل إلى قسم "المهام" من الصفحة الرئيسية
2. ستجد عدد المهام المتاحة حسب باقتك
3. اضغط على "بدء المهمة" لكل مهمة
4. انتظر حتى ينتهي العداد التنازلي
5. بمجرد الانتهاء، سيُضاف الربح تلقائياً لرصيدك

ملاحظة: المهام تتجدد يومياً في منتصف الليل. تأكد من إكمال جميع مهامك اليومية للحصول على أقصى ربح!`
  },
  {
    id: "wallet",
    icon: <Wallet className="w-5 h-5" />,
    question: "كيف أودع وأسحب أموالي؟",
    answer: `للإيداع في حسابك:

1. ادخل إلى قسم "المحفظة" ثم اضغط "إيداع"
2. حوّل المبلغ إلى رقم المحفظة: ${WALLET_NUMBER}
3. ارفع صورة إيصال التحويل
4. أدخل رقم العملية المكوّن من 14 رقماً
5. انتظر مراجعة الإدارة (عادة خلال 24 ساعة)

للسحب من حسابك:

1. ادخل إلى قسم "المحفظة"
2. تأكد أن رصيدك وصل للحد الأدنى للسحب (يختلف حسب الباقة)
3. اضغط على زر "سحب"
4. أدخل المبلغ المطلوب سحبه
5. اختر بوابة الدفع (${PAYMENT_GATEWAYS})
6. أدخل رقم المحفظة الإلكترونية واسم صاحبها
7. اضغط "تقديم طلب السحب"

بوابات الدفع المدعومة: ${PAYMENT_GATEWAYS}.
سيتم مراجعة طلب السحب من الإدارة خلال 24 ساعة. المبلغ يُخصم فوراً من رصيدك عند تقديم الطلب.`
  },
  {
    id: "referral",
    icon: <Users className="w-5 h-5" />,
    question: "كيف يعمل نظام الإحالات؟",
    answer: `نظام الإحالات يتيح لك كسب أرباح إضافية من خلال دعوة أصدقائك:

1. ادخل إلى "الفريق" من القائمة الرئيسية
2. ستجد رابط الإحالة الخاص بك
3. شارك الرابط مع أصدقائك
4. عندما يسجل صديقك عبر رابطك ويشحن رصيده، تحصل على عمولة

المكافآت:
- تحصل على نسبة من كل شحن يقوم به المُحال
- كلما زاد عدد فريقك، زادت أرباحك الإضافية
- يمكنك متابعة أداء فريقك من قسم "الفريق"

نصيحة: شارك الرابط على وسائل التواصل الاجتماعي لزيادة فريقك!`
  },
  {
    id: "wheel",
    icon: <Gift className="w-5 h-5" />,
    question: "ما هي عجلة الحظ وكيف أستخدمها؟",
    answer: `عجلة الحظ هي ميزة حصرية لباقات VIP:

- متاحة مرة واحدة يومياً لمشتركي VIP 1 و VIP 2 و VIP 3
- تحتوي على جوائز متنوعة (نقود، نقاط، مكافآت)
- للاستخدام: ادخل للصفحة الرئيسية واضغط على العجلة
- الجائزة تُضاف تلقائياً لحسابك

ملاحظة للمبتدئين: عجلة الحظ تتوفر فقط بعد ترقية الباقة إلى VIP.`
  },
  {
    id: "support",
    icon: <MessageSquare className="w-5 h-5" />,
    question: "كيف أتواصل مع الدعم الفني؟",
    answer: `يمكنك التواصل مع فريق الدعم بعدة طرق:

1. المساعد الذكي (AI): متاح داخل التطبيق ويجاوبك فورًا على أغلب الأسئلة الشائعة
2. نموذج طلب الدعم: من داخل التطبيق، اذهب إلى "الدعم الفني" واملأ النموذج وأرسل طلبك
3. التحدث المباشر مع فريق الدعم البشري: متاح حصريًا لمشتركي باقات VIP

نصائح للحصول على دعم أ��رع:
- اذكر رقم عضويتك
- صف المشكلة بوضوح
- أرفق لقطة شاشة إن أمكن

نسعى للرد على جميع الاستفسارات خلال 24 ساعة.`
  },
  {
    id: "upgrade",
    icon: <Zap className="w-5 h-5" />,
    question: "كيف أقوم بترقية باقتي؟",
    answer: `لترقية باقتك والاستمتاع بمزايا أعلى:

1. اذهب إلى قسم "الباقات" من القائمة
2. اختر الباقة المناسبة لك
3. اضغط على "ترقية الآن"
4. حوّل المبلغ المطلوب لرقم المحفظة ${WALLET_NUMBER}
5. ارفع صورة إيصال التحويل من جهازك
6. انتظر موافقة الإدارة (خلال 24 ساعة)

بعد الموافقة:
- تُفعَّل الباقة الجديدة فوراً
- تحصل على جميع مزايا الباقة
- تتجدد مهامك اليومية

ملاحظة: الترقية تكون للباقة الأعلى مباشرة ولا يمكن التنزيل للباقات الأدنى.`
  },
  {
    id: "points",
    icon: <Gift className="w-5 h-5" />,
    question: "ما هو نظام النقاط وكيف أستخدمه؟",
    answer: `نظام النقاط يتيح لك كسب نقاط إضافية من خلال التفاعل مع التطبيق:

- تكسب نقاط من التفاعل مع الإعلانات والتقييمات
- يمكنك تحويل النقاط إلى رصيد حقيقي من قسم "تحويل النقاط"
- كلما زاد تفاعلك، زادت نقاطك

نصيحة: تفاعل مع الإعلانات يومياً لتجميع أكبر عدد من النقاط!`
  },
  {
    id: "trial",
    icon: <Shield className="w-5 h-5" />,
    question: "ماذا يحدث بعد انتهاء فترة التجربة؟",
    answer: `فترة التجربة المجانية مدتها 7 أيام من تاريخ إنشاء الحساب:

- خلال التجربة: يمكنك تنفيذ المهام اليومية واستخدام عجلة الحظ
- بعد انتهاء التجربة: تتوقف المهام اليومية وعجلة الحظ تلقائياً
- لا يمكن سحب أي أرباح خلال فترة التجربة
- لاستئناف الربح: يجب ترقية حسابك لإحدى باقات VIP

نصيحة: استغل فترة التجربة لاستكشاف جميع مزايا التطبيق قبل الترقية!`
  },
  {
    id: "membership",
    icon: <IdCard className="w-5 h-5" />,
    question: "ما هو رقم العضوية وكيف أستخدمه؟",
    answer: `رقم العضوية هو رقم فريد مكون من 9 أرقام:

- يُنشأ تلقائياً عند تسجيل حسابك
- يُستخدم كرمز إحالة لدعوة أصدقائك
- يمكنك مشاركته مع الآخرين للانضمام عبر رابط الإحالة الخاص بك
- يظهر في الملف الشخصي وقسم الفريق

ملاحظة: رقم العضوية ثابت ولا يمكن تغييره.`
  },
  {
    id: "contest",
    icon: <Target className="w-5 h-5" />,
    question: "كيف تعمل المسابقات اليومية؟",
    answer: `المسابقات تعتمد على مستويات يومية:

- يفتح مستوى واحد فقط كل يوم في تمام الساعة 12 منتصف الليل بتوقيت القاهرة
- إذا لم تجاوب اليوم، يبقى المستوى التالي مغلقاً حتى تكمل الحالي
- الإجابة الصحيحة تنقلك للسؤال التالي في نفس المستوى
- الإجابة الخاطئة لا تعيدك من البداية، فقط تُحتسب كمحاولة
- عند إكمال المستوى تحصل على المكافأة المحددة (رصيد، نقاط، أو ترقية مؤقتة)`
  },
  {
    id: "ai-support",
    icon: <MessageSquare className="w-5 h-5" />,
    question: "ما هو المساعد الذكي في الدعم الفني؟",
    answer: `المساعد الذكي هو بوت محادثة مدمج في قسم الدعم يجيب فوراً عن أسئلتك حول تطبيق Advance:

- الباقات وفروق الأسعار
- كيفية السحب والإيداع
- المهام والنقاط وعجلة الحظ
- ترقية الباقة وحل المشاكل الشائعة

ملاحظة: المساعد الذكي مخصص لأسئلة التطبيق فقط. إذا احتجت لتدخل بشري، استخدم تبويب "رسالة للإدارة".`
  },
  {
    id: "blocked",
    icon: <Shield className="w-5 h-5" />,
    question: "ماذا أفعل إذا تم إيقاف حسابي؟",
    answer: `قد يتم إيقاف الحساب لأسباب مثل:

- محاولة استخدام أكثر من حساب على نفس الجهاز
- إدخال بيانات سحب وهمية أو مزيفة
- مخالفة شروط الاستخدام

للاستفسار أو الطعن:
1. تواصل مع الدعم الفني من داخل التطبيق
2. اذكر رقم عضويتك والبريد المسجل
3. اشرح الموقف بوضوح وانتظر الرد من فريق الإدارة`
  },
  {
    id: "verification",
    icon: <IdCard className="w-5 h-5" />,
    question: "كيف أوثّق حسابي وأحصل على مكافأة 50 جنيه؟",
    answer: `لتوثيق حسابك والحصول على مكافأة 50 جنيه:

1. افتح الإعدادات أو قسم التحقق داخل التطبيق
2. ارفع صورة بطاقة الرقم القومي أو أي مستند إثبات هوية مقبول
3. اكمل خطوات التحقق المطلوبة (مثل ربط التليجرام أو تأكيد رقم الهاتف)
4. بعد التحقق من الإدارة سيتم إضافة 50 جنيه إلى رصيدك (قد يستغرق حتى 24 ساعة)

ملاحظة: تأكد من أن المستند واضح ومطابق للبيانات المسجلة في الحساب.`
  }
];

export const FAQ = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
          <HelpCircle className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">الأسئلة الشائعة</h1>
        <p className="text-muted-foreground">كل ما تحتاج معرفته عن التطبيق</p>
      </div>

      <div className="space-y-3">
        {faqData.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(item.id)}
              className="w-full p-4 flex items-center gap-3 text-right hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {item.icon}
              </div>
              <span className="flex-1 font-bold text-foreground">{item.question}</span>
              <div className="shrink-0 text-muted-foreground">
                {expandedId === item.id ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </button>
            
            <AnimatePresence>
              {expandedId === item.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0">
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div className="bg-primary/10 rounded-xl p-4 border border-primary/30">
        <p className="text-sm text-center text-muted-foreground">
          لم تجد إجابة سؤالك؟ تواصل معنا عبر <a href="http://t.me/Advance0bot" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">بوت التليجرام</a> أو عبر صفحة الدعم داخل التطبيق.
        </p>
      </div>
    </div>
  );
};
