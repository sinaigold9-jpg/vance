import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const APP_LINKS = [
  { label: "الصفحة الرئيسية", path: "/app" },
  { label: "الباقات", path: "/app/packages" },
  { label: "المهام وعجلة الحظ", path: "/app/tasks" },
  { label: "المحفظة", path: "/app/wallet" },
  { label: "الفريق والإحالة", path: "/app/team" },
  { label: "الأرباح", path: "/app/earnings" },
  { label: "الإعلانات", path: "/app/ads" },
  { label: "العروض والمسابقات", path: "/app/offers" },
  { label: "الملف الشخصي", path: "/app/profile" },
  { label: "الممول (Sponsor)", path: "/app/sponsor" },
  { label: "الدعم الفني", path: "/app/support" },
  { label: "الأسئلة الشائعة", path: "/app/faq" },
  { label: "صفحة التسجيل", path: "/auth" },
  { label: "صفحة التحميل", path: "/download" },
  { label: "الصفحة الترحيبية", path: "/landing" },
];

export const AdminInternalLinksTab = () => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const baseUrl = window.location.origin;

  const handleCopy = (path: string, idx: number) => {
    const fullUrl = `${baseUrl}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedIdx(idx);
    toast.success("تم نسخ الرابط");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">الروابط الداخلية للتطبيق</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          انسخ أي رابط واستخدمه في العروض أو الإعلانات أو المسابقات لربط المستخدم مباشرة بالقسم المطلوب.
        </p>
        <div className="space-y-2">
          {APP_LINKS.map((link, idx) => (
            <div
              key={link.path}
              className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2.5 gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{link.label}</p>
                <p className="text-xs text-muted-foreground truncate" dir="ltr">
                  {baseUrl}{link.path}
                </p>
              </div>
              <Button
                size="sm"
                variant={copiedIdx === idx ? "default" : "outline"}
                onClick={() => handleCopy(link.path, idx)}
                className="shrink-0"
              >
                {copiedIdx === idx ? (
                  <><Check className="w-4 h-4 ml-1" />تم</>
                ) : (
                  <><Copy className="w-4 h-4 ml-1" />نسخ</>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
