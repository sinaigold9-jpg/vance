import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, User, Phone, Mail, CheckCircle, XCircle, Clock, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

type AccountType = "beginner" | "vip1" | "vip2" | "vip3";

interface UpgradeRequest {
  id: string;
  user_id: string;
  current_package: AccountType;
  requested_package: AccountType;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at: string | null;
  user?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

export const AdminUpgradeRequestsTab = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("package_upgrade_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("حدث خطأ في تحميل الطلبات");
    } else {
      // Fetch user profiles
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      setRequests((data || []).map(r => ({
        ...r,
        user: profilesMap.get(r.user_id)
      })));
    }
    setLoading(false);
  };

  const fetchReceipt = async (userId: string, requestId: string) => {
    // Try to find receipt in storage
    const { data: files } = await supabase.storage
      .from("receipts")
      .list(`${userId}`, { limit: 100 });

    if (files && files.length > 0) {
      // Get the most recent receipt
      const latestFile = files.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      
      const { data } = await supabase.storage
        .from("receipts")
        .createSignedUrl(`${userId}/${latestFile.name}`, 3600);

      setReceiptUrl(data?.signedUrl ?? null);
    } else {
      setReceiptUrl(null);
    }
  };

  const handleViewRequest = async (request: UpgradeRequest) => {
    setSelectedRequest(request);
    await fetchReceipt(request.user_id, request.id);
  };

  const handleUpdateStatus = async (requestId: string, status: "approved" | "rejected", userId: string, requestedPackage: "beginner" | "vip1" | "vip2" | "vip3") => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("package_upgrade_requests")
        .update({
          status,
          processed_at: new Date().toISOString(),
          processed_by: user?.id
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, update user's account type
      if (status === "approved") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ account_type: requestedPackage })
          .eq("id", userId);

        if (profileError) throw profileError;

        // Log activity
        await supabase.from("activity_logs").insert({
          user_id: userId,
          action: "ترقية الباقة",
          details: { package: requestedPackage, approved_by: user?.email },
        });
      }

      toast.success(status === "approved" ? "تم قبول الطلب وتفعيل الباقة" : "تم رفض الطلب");
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("حدث خطأ أثناء تحديث الطلب");
    }
  };

  const getPackageLabel = (type: string) => {
    const labels: Record<string, string> = {
      beginner: "المبتدئ",
      vip1: "VIP 1",
      vip2: "VIP 2",
      vip3: "VIP 3",
    };
    return labels[type] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-vip-gold" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "مقبول";
      case "rejected":
        return "مرفوض";
      default:
        return "قيد المراجعة";
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMMM yyyy - hh:mm a", { locale: ar });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          لا يوجد طلبات ترقية
        </div>
      ) : (
        requests.map((request, index) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold">{request.user?.full_name || "مستخدم"}</span>
                  <span className="flex items-center gap-1 text-sm">
                    {getStatusIcon(request.status)}
                    {getStatusLabel(request.status)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {request.user?.email || "-"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {request.user?.phone || "-"}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-primary" />
                  <span>{getPackageLabel(request.current_package)}</span>
                  <span>→</span>
                  <span className="font-bold text-primary">{getPackageLabel(request.requested_package)}</span>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(request.created_at)}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewRequest(request)}
              >
                <Eye className="w-4 h-4 ml-1" />
                عرض
              </Button>
            </div>
          </motion.div>
        ))
      )}

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل طلب الترقية</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold">{selectedRequest.user?.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedRequest.user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedRequest.user?.phone}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 py-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">الباقة الحالية</p>
                  <p className="font-bold">{getPackageLabel(selectedRequest.current_package)}</p>
                </div>
                <div className="text-2xl">→</div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">الباقة المطلوبة</p>
                  <p className="font-bold text-primary">{getPackageLabel(selectedRequest.requested_package)}</p>
                </div>
              </div>

              {/* Receipt Preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium">إيصال الدفع:</p>
                {receiptUrl ? (
                  <div className="relative">
                    <img 
                      src={receiptUrl} 
                      alt="إيصال الدفع" 
                      className="w-full rounded-lg border border-border"
                    />
                    <a 
                      href={receiptUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute top-2 left-2 bg-background/80 backdrop-blur p-2 rounded-lg"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/50 rounded-lg text-muted-foreground">
                    لم يتم العثور على إيصال
                  </div>
                )}
              </div>

              {selectedRequest.status === "pending" && !showRejectInput && (
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => handleUpdateStatus(
                      selectedRequest.id, 
                      "approved", 
                      selectedRequest.user_id,
                      selectedRequest.requested_package
                    )}
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    قبول وتفعيل
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setShowRejectInput(true)}
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    رفض
                  </Button>
                </div>
              )}

              {selectedRequest.status === "pending" && showRejectInput && (
                <div className="space-y-3 pt-4">
                  <Textarea
                    placeholder="اكتب سبب الرفض للمستخدم..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={async () => {
                        if (!rejectReason.trim()) {
                          toast.error("يرجى كتابة سبب الرفض");
                          return;
                        }
                        
                        // Send notification to user
                        await supabase.from("notifications").insert({
                          user_id: selectedRequest.user_id,
                          title: "تم رفض طلب الترقية",
                          message: `سبب الرفض: ${rejectReason}`,
                          type: "upgrade_rejected",
                        });

                        await handleUpdateStatus(
                          selectedRequest.id,
                          "rejected",
                          selectedRequest.user_id,
                          selectedRequest.requested_package
                        );
                        setShowRejectInput(false);
                        setRejectReason("");
                      }}
                    >
                      <XCircle className="w-4 h-4 ml-2" />
                      تأكيد الرفض
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
