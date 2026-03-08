import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCategoryLabel, getCategoryIcon } from "@/components/ads/AdCategories";
import { 
  Megaphone, Check, X, Eye, Clock, Search, 
  ExternalLink, BarChart3, MessageSquare, Archive
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Advertisement {
  id: string;
  title: string;
  short_description: string;
  full_description: string | null;
  external_link: string | null;
  category: string;
  ad_type: string;
  status: string;
  images: string[];
  views_count: number;
  clicks_count: number;
  max_views: number;
  promotion_days: number;
  promotion_amount: number;
  created_at: string;
  user_id: string;
  rejected_reason: string | null;
  profiles?: { full_name: string; email: string; membership_id: string };
}

export const AdminAdsTab = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    fetchAds();
  }, [statusFilter]);

  const fetchAds = async () => {
    setIsLoading(true);
    let query = supabase
      .from("advertisements")
      .select(`
        *,
        profiles:user_id (full_name, email, membership_id)
      `)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as any);
    }

    const { data } = await query;
    if (data) setAds(data as any);
    setIsLoading(false);
  };

  const handleApprove = async (ad: Advertisement) => {
    try {
      await supabase
        .from("advertisements")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", ad.id);

      // Send approval as incoming message
      await supabase.from("notifications").insert({
        user_id: ad.user_id,
        title: "تمت الموافقة على إعلانك ✅",
        message: `مبروك! تمت الموافقة على إعلان "${ad.title}" وهو الآن منشور ومرئي لجميع المستخدمين.`,
        type: "private_message",
        related_id: ad.id
      });

      toast.success("تمت الموافقة على الإعلان");
      fetchAds();
      setSelectedAd(null);
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    }
  };

  const handleReject = async (ad: Advertisement) => {
    if (!rejectReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض");
      return;
    }

    try {
      await supabase
        .from("advertisements")
        .update({
          status: "rejected",
          rejected_reason: rejectReason
        })
        .eq("id", ad.id);

      // Send rejection as incoming message
      await supabase.from("notifications").insert({
        user_id: ad.user_id,
        title: "تم رفض إعلانك: " + ad.title,
        message: `عذراً، تم رفض إعلانك "${ad.title}".\n\nسبب الرفض: ${rejectReason}\n\nيمكنك تعديل الإعلان وإعادة إرساله للمراجعة.`,
        type: "private_message",
        related_id: ad.id
      });

      // Refund if paid
      if (ad.ad_type === "paid" && ad.promotion_amount > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", ad.user_id)
          .single();

        if (profile) {
          await supabase
            .from("profiles")
            .update({ balance: profile.balance + ad.promotion_amount })
            .eq("id", ad.user_id);

          await supabase.from("activity_logs").insert({
            user_id: ad.user_id,
            action: "استرداد مبلغ إعلان مرفوض",
            amount: ad.promotion_amount
          });
        }
      }

      toast.success("تم رفض الإعلان");
      fetchAds();
      setSelectedAd(null);
      setRejectReason("");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    }
  };

  const handleArchive = async (ad: Advertisement) => {
    try {
      await supabase
        .from("advertisements")
        .update({ status: "archived" })
        .eq("id", ad.id);

      toast.success("تم أرشفة الإعلان");
      fetchAds();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1 border-amber-500 text-amber-500"><Clock className="w-3 h-3" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="gap-1 bg-accent"><Check className="w-3 h-3" />موافق عليه</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" />مرفوض</Badge>;
      case "archived":
        return <Badge variant="secondary" className="gap-1"><Archive className="w-3 h-3" />مؤرشف</Badge>;
      default:
        return null;
    }
  };

  const filteredAds = ads.filter(ad => 
    ad.title.includes(searchQuery) ||
    ad.profiles?.full_name.includes(searchQuery) ||
    ad.profiles?.membership_id?.includes(searchQuery)
  );

  const stats = {
    pending: ads.filter(a => a.status === "pending").length,
    approved: ads.filter(a => a.status === "approved").length,
    rejected: ads.filter(a => a.status === "rejected").length,
    total: ads.length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">قيد المراجعة</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">موافق عليه</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">مرفوض</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">إجمالي</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالعنوان أو اسم المستخدم..."
            className="pr-10"
          />
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="approved">منشور</TabsTrigger>
          <TabsTrigger value="rejected">مرفوض</TabsTrigger>
          <TabsTrigger value="all">الكل</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-card/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredAds.length > 0 ? (
            <div className="space-y-4">
              {filteredAds.map(ad => (
                <motion.div
                  key={ad.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-border/50 overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {ad.images?.[0] && (
                        <div className="w-full sm:w-40 h-32 flex-shrink-0">
                          <img
                            src={ad.images[0]}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold">{ad.title}</h3>
                              {getStatusBadge(ad.status)}
                              {ad.ad_type === "paid" ? (
                                <Badge className="bg-gradient-gold text-primary-foreground text-xs">
                                  مدفوع - {ad.promotion_amount} جنيه
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">مجاني</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                              {ad.short_description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              <span>{getCategoryIcon(ad.category)} {getCategoryLabel(ad.category)}</span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {ad.views_count}/{ad.max_views}
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="w-3 h-3" />
                                {ad.clicks_count} نقرة
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(ad.created_at), "dd MMM yyyy - hh:mm a", { locale: ar })}
                              </span>
                            </div>
                            <div className="mt-2 text-xs">
                              <span className="text-muted-foreground">المعلن: </span>
                              <span>{ad.profiles?.full_name}</span>
                              <span className="text-muted-foreground mx-2">|</span>
                              <span className="font-mono">{ad.profiles?.membership_id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons - always visible */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
                          {ad.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(ad)}
                                className="gap-1 bg-accent"
                              >
                                <Check className="w-4 h-4" />
                                موافقة على النشر
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setSelectedAd(ad)}
                                className="gap-1"
                              >
                                <X className="w-4 h-4" />
                                رفض
                              </Button>
                            </>
                          )}
                          {ad.status === "approved" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleArchive(ad)}
                              className="gap-1"
                            >
                              <Archive className="w-4 h-4" />
                              أرشفة
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAd(ad)}
                            className="gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            عرض التفاصيل
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card/50 rounded-xl">
              <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد إعلانات</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Ad Detail Modal */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAd(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            {selectedAd.images?.[0] && (
              <img
                src={selectedAd.images[0]}
                alt={selectedAd.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">{selectedAd.title}</h2>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedAd.status)}
                    <Badge variant="outline">
                      {getCategoryIcon(selectedAd.category)} {getCategoryLabel(selectedAd.category)}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAd(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4">
                <p className="font-medium mb-2">معلومات المعلن</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">الاسم:</span> {selectedAd.profiles?.full_name}</div>
                  <div><span className="text-muted-foreground">البريد:</span> {selectedAd.profiles?.email}</div>
                  <div><span className="text-muted-foreground">العضوية:</span> {selectedAd.profiles?.membership_id}</div>
                  <div><span className="text-muted-foreground">التاريخ:</span> {format(new Date(selectedAd.created_at), "dd MMM yyyy", { locale: ar })}</div>
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">الوصف</p>
                <p className="text-muted-foreground">{selectedAd.short_description}</p>
                {selectedAd.full_description && (
                  <p className="mt-2 text-sm bg-secondary/30 rounded-lg p-3">{selectedAd.full_description}</p>
                )}
              </div>

              {/* Payment Info */}
              <div className="bg-secondary/30 rounded-xl p-4">
                <p className="font-medium mb-2">نوع الإعلان</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {selectedAd.ad_type === "paid" ? (
                    <>
                      <Badge className="bg-gradient-gold text-primary-foreground">إعلان مدفوع</Badge>
                      <span className="text-sm">المبلغ: <strong>{selectedAd.promotion_amount} جنيه</strong></span>
                      <span className="text-sm">المدة: <strong>{selectedAd.promotion_days} يوم</strong></span>
                    </>
                  ) : (
                    <Badge variant="secondary">إعلان مجاني</Badge>
                  )}
                </div>
              </div>

              {selectedAd.external_link && (
                <a
                  href={selectedAd.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {selectedAd.external_link}
                </a>
              )}

              {selectedAd.status === "pending" && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(selectedAd)}
                      className="flex-1 gap-2 bg-accent"
                    >
                      <Check className="w-4 h-4" />
                      موافقة
                    </Button>
                  </div>
                  <div>
                    <Textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="سبب الرفض (إجباري)"
                      rows={2}
                    />
                    <Button
                      onClick={() => handleReject(selectedAd)}
                      variant="destructive"
                      className="w-full mt-2 gap-2"
                    >
                      <X className="w-4 h-4" />
                      رفض
                    </Button>
                  </div>
                </div>
              )}

              {selectedAd.status === "rejected" && selectedAd.rejected_reason && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
                  <p className="font-medium text-destructive mb-1">سبب الرفض</p>
                  <p className="text-sm">{selectedAd.rejected_reason}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
