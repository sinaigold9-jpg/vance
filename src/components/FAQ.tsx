import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, ChevronUp, Crown, Wallet, Users, Gift, Target, Shield, MessageSquare, Zap } from "lucide-react";
import { BackButton } from "./BackButton";

interface FAQItem {
  id: string;
  icon: React.ReactNode;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: "packages",
    icon: <Crown className="w-5 h-5" />,
    question: "ما هي الباقات المتاحة وما الفرق بينها؟",
    answer: `يوفر التطبيق أربع باقات مختلفة لتناسب جميع المستخدمين:

• باقة المبتدئ (مجانية): تجربة لمدة 7 أيام مع 3 مهام يومية وربح 0.50 جنيه لكل مهمة. الحد الأدنى للسحب 100 جنيه.

• باقة VIP 1 (100 جنيه): 4 مهام يومية بربح 1 جنيه لكل مهمة، مع عجلة حظ يومية وحد أدنى للسحب 50 جنيه.

• باقة VIP 2 (200 جنيه): 5 مهام يومية بربح 2 جنيه لكل مهمة، عجلة حظ يومية وحد أدنى للسحب 75 جنيه.

• باقة VIP 3 (500 جنيه): 6 مهام يومية بربح 5 جنيه لكل مهمة، عجلة حظ يومية وحد أدنى للسحب 100 جنيه.

كلما ارتفعت الباقة، زادت الأرباح اليومية والمزايا الإضافية.`
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
    id: "withdrawal",
    icon: <Wallet className="w-5 h-5" />,
    question: "كيف أسحب أرباحي؟",
    answer: `لسحب أرباحك، اتبع الخطوات التالية:

1. ادخل إلى قسم "المحفظة"
2. تأكد أن رصيدك وصل للحد الأدنى للسحب (يختلف حسب الباقة)
3. اضغط على زر "سحب"
4. أدخل المبلغ المطلوب سحبه
5. اختر بوابة الدفع (فودافون كاش، اتصالات كاش، أورنج موني، WE Pay)
6. أدخل رقم المحفظة الإلكترونية واسم صاحبها
7. أدخل كلمة مرور السحب الخاصة بك (6 أرقام)
8. اضغط "تقديم طلب السحب"

سيتم مراجعة طلبك من الإدارة خلال 24 ساعة. المبلغ يُخصم فوراً من رصيدك عند تقديم الطلب.`
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
• تحصل على نسبة من كل شحن يقوم به المُحال
• كلما زاد عدد فريقك، زادت أرباحك الإضافية
• يمكنك متابعة أداء فريقك من قسم "الفريق"

نصيحة: شارك الرابط على وسائل التواصل الاجتماعي لزيادة فريقك!`
  },
  {
    id: "wheel",
    icon: <Gift className="w-5 h-5" />,
    question: "ما هي عجلة الحظ وكيف أستخدمها؟",
    answer: `عجلة الحظ هي ميزة حصرية لباقات VIP:

• متاحة مرة واحدة يومياً لمشتركي VIP 1 و VIP 2 و VIP 3
• تحتوي على جوائز متنوعة (نقود، نقاط، مكافآت)
• للاستخدام: ادخل للصفحة الرئيسية واضغط على العجلة
• الجائزة تُضاف تلقائياً لحسابك

ملاحظة للمبتدئين: عجلة الحظ تتوفر فقط بعد ترقية الباقة إلى VIP.`
  },
  {
    id: "security",
    icon: <Shield className="w-5 h-5" />,
    question: "ما هي كلمة مرور السحب ولماذا هي مهمة؟",
    answer: `كلمة مرور السحب (PIN) هي طبقة حماية إضافية لأموالك:

• مكونة من 6 أرقام
• مختلفة عن كلمة مرور حسابك
• مطلوبة فقط عند إجراء عملية سحب
• يجب إعدادها عند إنشاء الحساب

نصائح أمان:
- لا تشارك كلمة مرور السحب مع أي شخص
- اختر أرقاماً لا يسهل تخمينها
- تجنب استخدام تاريخ ميلادك أو أرقام متتالية

إذا نسيت كلمة مرور السحب، تواصل مع الدعم الفني لإعادة تعيينها.`
  },
  {
    id: "support",
    icon: <MessageSquare className="w-5 h-5" />,
    question: "كيف أتواصل مع الدعم الفني؟",
    answer: `يمكنك التواصل مع فريق الدعم بعدة طرق:

1. من داخل التطبيق: اذهب إلى "الدعم الفني" وأرسل رسالتك
2. عبر بوت التليجرام: @Advance0bot
3. عبر قناة التليجرام الرسمية
4. عبر صفحة الفيسبوك الرسمية

نصائح للحصول على دعم أسرع:
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
4. سيُطلب منك تحويل المبلغ لرقم المحفظة المحدد
5. ارفع صورة إيصال التحويل
6. انتظر موافقة الإدارة (خلال 24 ساعة)

بعد الموافقة:
• تُفعَّل الباقة الجديدة فوراً
• تحصل على جميع مزايا الباقة
• تتجدد مهامك اليومية

ملاحظة: الترقية تكون للباقة الأعلى مباشرة ولا يمكن التنزيل للباقات الأدنى.`
  }
];

export const FAQ = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <BackButton />
      
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
          لم تجد إجابة سؤالك؟ تواصل معنا عبر <a href="http://t.me/Advance0bot" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">بوت التليجرام</a>
        </p>
      </div>
    </div>
  );
};