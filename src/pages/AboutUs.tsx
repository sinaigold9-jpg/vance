import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Info, Loader2 } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import appIcon from "@/assets/app-icon.png";

const AboutUs = () => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "about_us")
        .maybeSingle();
      setContent(data?.value || "تطبيق Advance (A Pro) — منصة رقمية للأرباح اليومية.");
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="عنا" path="/about" />
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <BackButton to="/settings" label="رجوع" />
          <h1 className="text-lg font-bold">عنا</h1>
          <div className="w-10" />
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-4 py-8 space-y-5"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <img src={appIcon} alt="A Pro" className="w-20 h-20 rounded-full ring-2 ring-primary/30" />
          <h2 className="text-2xl font-black">
            A <span className="text-gradient-gold">Pro</span>
          </h2>
          <p className="text-xs text-muted-foreground">Advance</p>
        </div>

        <Card>
          <CardContent className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-1" />
                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                  {content}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-4">
          © {new Date().getFullYear()} Advance — جميع الحقوق محفوظة
        </p>
      </motion.div>
    </div>
  );
};

export default AboutUs;