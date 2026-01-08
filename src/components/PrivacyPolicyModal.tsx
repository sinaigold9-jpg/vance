import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

const PRIVACY_POLICY_URL = "https://www.termsfeed.com/live/934671e3-6df3-4eca-a394-ba1e27a360d7";

export const PrivacyPolicyModal = ({ isOpen, onAccept }: PrivacyPolicyModalProps) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      onAccept();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            سياسة الخصوصية
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-muted-foreground">
            يرجى قراءة والموافقة على سياسة الخصوصية قبل إنشاء حسابك.
          </p>

          <a
            href={PRIVACY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-primary" />
            <span className="font-medium">اقرأ سياسة الخصوصية كاملة</span>
          </a>

          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <Checkbox
              id="accept-privacy"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-1"
            />
            <label
              htmlFor="accept-privacy"
              className="text-sm cursor-pointer leading-relaxed"
            >
              أقر بأنني قرأت وفهمت سياسة الخصوصية وأوافق على جميع الشروط والأحكام
            </label>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!accepted}
            className="w-full bg-gradient-gold text-primary-foreground"
          >
            <Check className="w-5 h-5 ml-2" />
            موافق ومتابعة
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};