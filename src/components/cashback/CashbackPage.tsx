import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, Sparkles, TrendingUp, Info, Clock, Gift, ArrowDownCircle,
  Star, Crown, Flame, Award, Zap, BadgeCheck, Rocket, Heart, Diamond, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  star: Star, crown: Crown, flame: Flame, award: Award, zap: Zap,
  check: BadgeCheck, rocket: Rocket, heart: Heart, diamond: Diamond, gift: Gift,
};

interface Badge { id: string; name: string; color: string; icon: string }
interface Tier {
  id: string; title: string; description: string | null;
  min_amount: number; max_amount: number | null; percentage: number;
  badge_id: string | null; is_active: boolean;
  // future loyalty columns, may not exist yet in generated types
  min_total_deposits?: number | null;
  min_account_age_days?: number | null;
}
interface Offer {
  id: string; title: string; description: string | null; image_url: string | null;
  color: string; percentage: number; min_amount: number; max_amount: number | null;
  starts_at: string; ends_at: string; display_order: number; is_active: boolean;
}
interface CashbackTx {
  id: string; kind: string; amount: number; base_amount: number;
  percentage: number; title: string | null; note: string | null; created_at: string;
}

const Countdown = ({ endsAt }: { endsAt: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(endsAt).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const box = (v: number, l: string) => (
    <div className="flex flex-col items-center bg-black/60 rounded-lg px-2 py-1 min-w-[44px] border border-white/10">
      <span className="text-base font-black tabular-nums text-primary">{String(v).padStart(2, "0")}</span>
      <span className="text-[9px] text-muted-foreground">{l}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      {box(d, "يوم")}{box(h, "ساعة")}{box(m, "دقيقة")}{box(s, "ثانية")}
    </div>
  );
};

export const CashbackPage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [total, setTotal] = useState(0);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [history, setHistory] = useState<CashbackTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      const [p, t, b, o, h, tx] = await Promise.all([
        user ? supabase.from("profiles").select("cashback_balance, total_cashback_earned, created_at").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("cashback_tiers").select("*").eq("is_active", true).order("min_amount", { ascending: true }),
        supabase.from("cashback_badges").select("*"),
        supabase.from("cashback_offers").select("*").eq("is_active", true).order("display_order", { ascending: true }),
        user ? supabase.from("cashback_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
        user ? supabase.from("transactions").select("amount").eq("user_id", user.id).eq("type", "deposit").eq("status", "approved") : Promise.resolve({ data: [] }),
      ]);
      if (p.data) {
        const pd = p.data as { cashback_balance?: number; total_cashback_earned?: number; created_at?: string };
        setBalance(Number(pd.cashback_balance || 0));
        setTotal(Number(pd.total_cashback_earned || 0));
        if (pd.created_at) {
          const days = Math.floor((Date.now() - new Date(pd.created_at).getTime()) / 86400000);
          setAccountAgeDays(days);
        }
      }
      setTiers(((t.data as Tier[]) || []).slice().sort((a, b2) => Number(a.min_amount) - Number(b2.min_amount)));
      setBadges((b.data as Badge[]) || []);
      setOffers((o.data as Offer[]) || []);
      setHistory((h.data as CashbackTx[]) || []);
      const deposits = ((tx.data as { amount: number }[]) || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      setTotalDeposits(deposits);
      setLoading(false);
    };
    load();
  }, [user]);

  const badgeMap = useMemo(() => new Map(badges.map((b) => [b.id, b])), [badges]);

  const liveOffers = useMemo(() => {
    const now = Date.now();
    void tick;
    return offers.filter((o) => new Date(o.starts_at).getTime() <= now && new Date(o.ends_at).getTime() > now);
  }, [offers, tick]);

  const fmtRange = (min: number, max: number | null) =>
    max === null ? `${min.toLocaleString()} جنيه فأكثر` : `${min.toLocaleString()} - ${max.toLocaleString()} جنيه`;

  // Whether the user meets a tier's requirements (amount range + optional loyalty extras)
  const qualifiesFor = (t: Tier) => {
    const minOk = totalDeposits >= Number(t.min_amount);
    const maxOk = t.max_amount === null || totalDeposits <= Number(t.max_amount);
    const minTotalDeposits = t.min_total_deposits ? Number(t.min_total_deposits) : 0;
    const minAccountAge = t.min_account_age_days ? Number(t.min_account_age_days) : 0;
    const loyaltyOk = totalDeposits >= minTotalDeposits && accountAgeDays >= minAccountAge;
    return minOk && maxOk && loyaltyOk;
  };

  // Determine the single "current" tier: highest qualifying tier by min_amount
  const currentTierId = useMemo(() => {
    let current: Tier | null = null;
    for (const t of tiers) {
      if (totalDeposits >= Number(t.min_amount) && qualifiesFor(t)) {
        current = t;
      }
    }
    return current?.id || null;
  }, [tiers, totalDeposits, accountAgeDays]);

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground">جاري تحميل الكاش باك...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Balance */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-primary/25 bg-[linear-gradient(150deg,#0a0a0a,#161207_60%,#0a0a0a)] p-6 shadow-card"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold">
            <Wallet className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">محفظة الكاش باك</h2>
            <p className="text-xs text-muted-foreground">استرداد نقدي على كل عملية شحن معتمدة</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/50 border border-white/10 p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">رصيد الكاش باك</p>
            <p className="text-2xl font-black text-gradient-gold">{balance.toLocaleString()} ج</p>
          </div>
          <div className="rounded-2xl bg-black/50 border border-white/10 p-4 text-center">
            <p className="text-[11px] text-muted-foreground mb-1">إجمالي ما حصلت عليه</p>
            <p className="text-2xl font-black text-emerald">{total.toLocaleString()} ج</p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/10 border border-primary/20 p-3">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            رصيد الكاش باك يُستخدم في شراء الباقات فقط، ولا يمكن سحبه نقدًا أو تحويله لمستخدم آخر.
          </p>
        </div>
      </motion.div>

      {/* Special offers */}
      {liveOffers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-black text-foreground">العروض الخاصة</h3>
          </div>
          {liveOffers.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border p-4 bg-black/70 overflow-hidden"
              style={{ borderColor: `${o.color}55`, boxShadow: `0 8px 30px -18px ${o.color}` }}
            >
              {o.image_url && (
                <img src={o.image_url} alt={o.title} loading="lazy" className="w-full h-28 object-cover rounded-xl mb-3" />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground truncate">{o.title}</h4>
                  {o.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.description}</p>}
                  <p className="text-[11px] text-muted-foreground mt-2">الشحن: {fmtRange(Number(o.min_amount), o.max_amount === null ? null : Number(o.max_amount))}</p>
                </div>
                <div className="text-center shrink-0 rounded-xl px-3 py-2" style={{ background: `${o.color}22`, border: `1px solid ${o.color}55` }}>
                  <p className="text-2xl font-black" style={{ color: o.color }}>{Number(o.percentage)}%</p>
                  <p className="text-[10px] text-muted-foreground">كاش باك</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" />ينتهي خلال</span>
                <Countdown endsAt={o.ends_at} />
              </div>
            </motion.div>
          ))}
        </section>
      )}

      {/* Tiers */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-black text-foreground">شرائح الكاش باك</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {tiers.map((t, i) => {
            const badge = t.badge_id ? badgeMap.get(t.badge_id) : undefined;
            const BadgeIcon = badge ? ICONS[badge.icon] || Star : Star;
            const isCurrent = t.id === currentTierId;
            const minTotalDeposits = t.min_total_deposits ? Number(t.min_total_deposits) : 0;
            const minAccountAge = t.min_account_age_days ? Number(t.min_account_age_days) : 0;
            return (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => setSelectedTier(t)}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`relative text-right rounded-2xl border bg-black/80 backdrop-blur-md p-4 flex flex-col gap-2 transition-shadow ${
                  isCurrent ? "border-primary ring-2 ring-primary shadow-gold" : "border-white/10"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2 -left-2 rounded-full bg-gradient-gold text-primary-foreground text-[9px] font-black px-2 py-0.5 flex items-center gap-1 shadow-gold">
                    <CheckCircle2 className="w-3 h-3" /> شريحتك
                  </span>
                )}
                <div className="flex items-center justify-center rounded-xl bg-gradient-gold/15 border border-primary/30 py-2">
                  <span className="text-2xl font-black text-gradient-gold leading-none">{Number(t.percentage)}%</span>
                </div>
                <h4 className="font-bold text-foreground text-sm truncate text-center">{t.title}</h4>
                {badge && (
                  <span
                    className="mx-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"
                    style={{ background: `${badge.color}22`, color: badge.color, border: `1px solid ${badge.color}66` }}
                  >
                    <BadgeIcon className="w-3 h-3" />
                    {badge.name}
                  </span>
                )}
                <p className="text-[11px] text-primary/80 text-center">{fmtRange(Number(t.min_amount), t.max_amount === null ? null : Number(t.max_amount))}</p>
                {(minTotalDeposits > 0 || minAccountAge > 0) && (
                  <div className="flex flex-wrap justify-center gap-1 mt-0.5">
                    {minTotalDeposits > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                        إجمالي شحن ≥ {minTotalDeposits.toLocaleString()}
                      </span>
                    )}
                    {minAccountAge > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                        عضوية ≥ {minAccountAge} يوم
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
          {tiers.length === 0 && <p className="col-span-2 text-center text-sm text-muted-foreground py-6">لا توجد شرائح متاحة حالياً</p>}
        </div>
      </section>

      {/* Tier details dialog */}
      <Dialog open={!!selectedTier} onOpenChange={(open) => !open && setSelectedTier(null)}>
        <DialogContent className="max-w-sm">
          {selectedTier && (() => {
            const t = selectedTier;
            const badge = t.badge_id ? badgeMap.get(t.badge_id) : undefined;
            const BadgeIcon = badge ? ICONS[badge.icon] || Star : Star;
            const isCurrent = t.id === currentTierId;
            const minTotalDeposits = t.min_total_deposits ? Number(t.min_total_deposits) : 0;
            const minAccountAge = t.min_account_age_days ? Number(t.min_account_age_days) : 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-foreground">
                    {t.title}
                    {badge && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: `${badge.color}22`, color: badge.color, border: `1px solid ${badge.color}66` }}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badge.name}
                      </span>
                    )}
                  </DialogTitle>
                  {t.description && <DialogDescription>{t.description}</DialogDescription>}
                </DialogHeader>
                <div className="space-y-3">
                  {isCurrent && (
                    <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/30 p-3 text-primary font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> شريحتك الحالية
                    </div>
                  )}
                  <div className="rounded-2xl bg-black/60 border border-white/10 p-4 text-center">
                    <p className="text-[11px] text-muted-foreground mb-1">نسبة الكاش باك</p>
                    <p className="text-3xl font-black text-gradient-gold">{Number(t.percentage)}%</p>
                  </div>
                  <div className="rounded-xl bg-black/50 border border-white/10 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground mb-1">نطاق الشحن</p>
                    <p className="text-sm font-bold text-primary/90">{fmtRange(Number(t.min_amount), t.max_amount === null ? null : Number(t.max_amount))}</p>
                  </div>
                  {(minTotalDeposits > 0 || minAccountAge > 0) && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {minTotalDeposits > 0 && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                          إجمالي شحن ≥ {minTotalDeposits.toLocaleString()}
                        </span>
                      )}
                      {minAccountAge > 0 && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                          عضوية ≥ {minAccountAge} يوم
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* How it works */}
      <section className="rounded-2xl border border-white/10 bg-black/60 p-5 space-y-3">
        <h3 className="font-black text-foreground flex items-center gap-2"><Info className="w-4 h-4 text-primary" />كيف يعمل الكاش باك؟</h3>
        <ol className="space-y-2 text-xs text-muted-foreground list-decimal pr-4 leading-relaxed">
          <li>تقوم بإرسال طلب شحن (إيداع) بالمبلغ الذي تريده.</li>
          <li>تراجع الإدارة العملية وتتأكد من وصول المبلغ.</li>
          <li>بعد اعتماد الطلب فقط، يُحسب الكاش باك تلقائيًا حسب الشريحة أو العرض الأعلى.</li>
          <li>يُضاف المبلغ إلى رصيد الكاش باك ويظهر في السجل بالأسفل.</li>
          <li>الطلبات المرفوضة أو الملغاة لا تحصل على كاش باك، ولا يُحتسب أكثر من مرة لنفس العملية.</li>
        </ol>
      </section>

      {/* History */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ArrowDownCircle className="w-5 h-5 text-primary" />
          <h3 className="font-black text-foreground">سجل الكاش باك</h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/60 divide-y divide-white/5">
          {history.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">لا توجد عمليات كاش باك بعد</p>}
          {history.map((h) => (
            <div key={h.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{h.title || (h.kind === "spend" ? "استخدام كاش باك" : "كاش باك")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(h.created_at).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                  {h.kind === "earn" && Number(h.base_amount) > 0 && ` • ${Number(h.percentage)}% من ${Number(h.base_amount)} ج`}
                </p>
              </div>
              <span className={`font-black shrink-0 ${Number(h.amount) < 0 ? "text-destructive" : "text-emerald"}`}>
                {Number(h.amount) > 0 ? "+" : ""}{Number(h.amount)} ج
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
