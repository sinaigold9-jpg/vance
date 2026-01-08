import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gift, Wallet, Users, Target, Sparkles, 
  ArrowLeft, ArrowRight, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingTourProps {
  onComplete: () => void;
}

const tourSteps = [
  {
    icon: Gift,
    title: "مرحباً بك في Advance!",
    description: "لقد حصلت على 7 أيام تجربة مجانية كاملة. دعنا نتعرف على الميزات!",
    color: "from-amber-500 to-amber-600",
  },
  {
    icon: Target,
    title: "المهام اليومية",
    description: "أكمل 3 مهام بسيطة يومياً للحصول على أرباحك. كل مهمة تستغرق دقائق قليلة فقط.",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Sparkles,
    title: "عجلة الحظ",
    description: "جرب حظك مع عجلة الحظ واربح جوائز إضافية! المبتدئون يحصلون على فرصة واحدة.",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Users,
    title: "نظام الإحالة",
    description: "ادعُ أصدقاءك واكسب مكافآت عند تسجيلهم. كل إحالة ناجحة تعني أرباح إضافية!",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Wallet,
    title: "المحفظة والسحب",
    description: "اجمع أرباحك واسحبها إلى محفظتك الإلكترونية. لا تنسَ إنشاء رمز السحب الخاص!",
    color: "from-pink-500 to-pink-600",
  },
];

export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = tourSteps[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-primary w-6"
                  : index < currentStep
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-card border border-border rounded-2xl p-8 text-center shadow-xl"
          >
            {/* Icon */}
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} mx-auto mb-6 flex items-center justify-center shadow-lg`}>
              <StepIcon className="w-10 h-10 text-white" />
            </div>

            {/* Content */}
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {step.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              {step.description}
            </p>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                السابق
              </Button>

              {currentStep < tourSteps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-gold text-primary-foreground gap-2"
                >
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-gold text-primary-foreground gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  ابدأ الآن
                </Button>
              )}
            </div>

            {/* Skip button */}
            <Button
              variant="link"
              onClick={handleSkip}
              className="mt-4 text-muted-foreground"
            >
              تخطي الجولة
            </Button>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};