import { useState, useEffect } from "react";
import { Link2, Copy, Check, Clock, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const APP_LINKS = [
  { label: "الصفحة الرئيسية", path: "/app" },
  { label: "الباقات", path: "/app/packages" },
  { label: "المهام اليومية", path: "/app/tasks" },
  { label: "عجلة الحظ", path: "/app/wheel" },
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
  
  { label: "الصفحة الترحيبية", path: "/landing" },
];

interface OfferLink {
  id: string;
  title: string;
  type: string;
  is_active: boolean;
  ends_at: string | null;
}

export const AdminInternalLinksTab = () => {
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);
  const [offerLinks, setOfferLinks] = useState<OfferLink[]>([]);
  const baseUrl = window.location.origin;

  useEffect(() => {
    fetchOfferLinks();
  }, []);

  const fetchOfferLinks = async () => {
    const { data } = await supabase
      .from("offers_contests")
      .select("id, title, type, is_active, ends_at")
      .order("created_at", { ascending: false });
    if (data) setOfferLinks(data as OfferLink[]);
  };

  const handleCopy = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(key);
    toast.success("تم نسخ الرابط");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const isExpired = (endsAt: string | null) => {
    if (!endsAt) return false;
    return new Date(endsAt).getTime() < Date.now();
  };

  return (
    <div className="space-y-6">
      {/* Static App Links */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">الروابط الداخلية الثابتة</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          انسخ أي رابط واستخدمه في العروض أو الإعلانات أو المسابقات.
        </p>
        <div className="space-y-2">
          {APP_LINKS.map((link) => {
            const fullUrl = `${baseUrl}${link.path}`;
            const key = `static-${link.path}`;
            return (
              <div
                key={link.path}
                className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2.5 gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">
                    {fullUrl}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={copiedIdx === key ? "default" : "outline"}
                  onClick={() => handleCopy(fullUrl, key)}
                  className="shrink-0"
                >
                  {copiedIdx === key ? (
                    <><Check className="w-4 h-4 ml-1" />تم</>
                  ) : (
                    <><Copy className="w-4 h-4 ml-1" />نسخ</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Offer Links */}
      <div className="bg-card border border-primary/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">روابط العروض والمسابقات المؤقتة</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          لكل عرض أو مسابقة رابط فريد مخفي عن المستخدمين. يمكنك نسخه ومشاركته في وسائل التواصل.
        </p>
        {offerLinks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Gift className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">لا توجد عروض أو مسابقات حالياً</p>
          </div>
        ) : (
          <div className="space-y-2">
            {offerLinks.map((offer) => {
              const offerUrl = `${baseUrl}/app/offers?id=${offer.id}`;
              const key = `offer-${offer.id}`;
              const expired = isExpired(offer.ends_at);
              return (
                <div
                  key={offer.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-3 gap-2 border ${
                    expired 
                      ? "bg-destructive/5 border-destructive/20" 
                      : offer.is_active 
                        ? "bg-primary/5 border-primary/20" 
                        : "bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{offer.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        offer.type === "offer" 
                          ? "bg-primary/20 text-primary" 
                          : "bg-accent/20 text-accent"
                      }`}>
                        {offer.type === "offer" ? "عرض" : "مسابقة"}
                      </span>
                      {expired && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold">
                          منتهي
                        </span>
                      )}
                      {!offer.is_active && !expired && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
                          متوقف
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate" dir="ltr">
                      {offerUrl}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={copiedIdx === key ? "default" : "outline"}
                    onClick={() => handleCopy(offerUrl, key)}
                    className="shrink-0"
                  >
                    {copiedIdx === key ? (
                      <><Check className="w-4 h-4 ml-1" />تم</>
                    ) : (
                      <><Copy className="w-4 h-4 ml-1" />نسخ</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
