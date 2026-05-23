import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  to?: string;
  label?: string;
}

export const BackButton = ({ to, label = "رجوع" }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="gap-2 hover:bg-primary/10"
      aria-label="رجوع"
    >
      <ArrowRight className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Button>
  );
};
