import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export const PageHeader = ({ title, subtitle, onBack }: PageHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 mb-6"
    >
      <Button
        variant="outline"
        size="icon"
        onClick={onBack}
        className="rounded-xl border-border/50 hover:bg-primary/10 hover:border-primary"
      >
        <ArrowRight className="w-5 h-5" />
      </Button>
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </motion.div>
  );
};
