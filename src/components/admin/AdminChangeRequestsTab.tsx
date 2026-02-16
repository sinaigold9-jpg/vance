import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, User, Check, X, Clock, Loader2, Mail, Phone, Key, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ChangeRequest {
  id: string;
  user_id: string;
  field_name: string;
  new_value: string;
  status: string;
  admin_note: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string | null;
    phone: string | null;
    membership_id: string | null;
  };
}

const fieldLabels: Record<string, string> = {
  full_name: "اسم المستخدم",
  email: "البريد الإلكتروني",
  phone: "رقم الهاتف",
  password: "كلمة المرور",
  withdrawal_pin: "كلمة مرور السحب",
};

const fieldIcons: Record<string, React.ReactNode> = {
  full_name: <User className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  password: <Key className="w-4 h-4" />,
  withdrawal_pin: <Lock className="w-4 h-4" />,
};

export const AdminChangeRequestsTab = () => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from("profile_change_requests")
      .select("*, profiles(full_name, email, phone, membership_id)")
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("status", "pending");
    }

    const { data, error } = await query;
    if (error) {
      toast.error("خطأ في تحميل الطلبات");
    } else {
      setRequests((data || []) as ChangeRequest[]);
    }
    setLoading(false);
  };

  const handleProcess = async (approved: boolean) => {
    if (!selectedRequest) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (approved) {
        // Apply the change based on field type
        if (selectedRequest.field_name === "password") {
          // Use edge function for password change
          const { error } = await supabase.functions.invoke("update-user-password", {
            body: { userId: selectedRequest.user_id, newPassword: selectedRequest.new_value },
          });
          if (error) throw error;
        } else if (selectedRequest.field_name === "withdrawal_pin") {
          // Use edge function for pin change
          const { error } = await supabase.functions.invoke("set-withdrawal-pin", {
            body: { userId: selectedRequest.user_id, pin: selectedRequest.new_value },
          });
          if (error) throw error;
        } else {
          // Use admin RPC for profile fields
          if (selectedRequest.field_name === "full_name") {
            const { error } = await supabase
              .from("profiles")
              .update({ full_name: selectedRequest.new_value })
              .eq("id", selectedRequest.user_id);
            if (error) throw error;
          } else if (selectedRequest.field_name === "email") {
            const { error } = await supabase.rpc("admin_update_user_balance", {
              _user_id: selectedRequest.user_id,
              _new_email: selectedRequest.new_value,
            });
            if (error) throw error;
          } else if (selectedRequest.field_name === "phone") {
            const { error } = await supabase.rpc("admin_update_user_balance", {
              _user_id: selectedRequest.user_id,
              _new_phone: selectedRequest.new_value,
            });
            if (error) throw error;
          }
        }
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("profile_change_requests")
        .update({
          status: approved ? "approved" : "rejected",
          admin_note: adminNote || null,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      toast.success(approved ? "تمت الموافقة وتحديث البيانات" : "تم رفض الطلب");
      setSelectedRequest(null);
      setAdminNote("");
      fetchRequests();
    } catch (error) {
      console.error("Error processing request:", error);
      toast.error("حدث خطأ في معالجة الطلب");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-emerald-500/20 text-emerald-500 gap-1"><Check className="w-3 h-3" />تمت الموافقة</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" />مرفوض</Badge>;
      default:
        return null;
    }
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
      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          المعلقة
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          الكل
        </Button>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {requests.map((req, index) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-bold">{req.profiles?.full_name || "مستخدم"}</span>
                  {getStatusBadge(req.status)}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1">
                    {fieldIcons[req.field_name]}
                    <span>تعديل: {fieldLabels[req.field_name] || req.field_name}</span>
                  </p>
                  <p>
                    القيمة الجديدة: {
                      req.field_name === "password" || req.field_name === "withdrawal_pin"
                        ? "••••••"
                        : req.new_value
                    }
                  </p>
                  <p>{new Date(req.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
              {req.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedRequest(req); setAdminNote(""); }}
                >
                  معالجة
                </Button>
              )}
            </div>
          </motion.div>
        ))}

        {requests.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد طلبات {filter === "pending" ? "معلقة" : ""}
          </div>
        )}
      </div>

      {/* Process Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>معالجة طلب التعديل</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
                <p><strong>المستخدم:</strong> {selectedRequest.profiles?.full_name}</p>
                <p><strong>الحقل:</strong> {fieldLabels[selectedRequest.field_name]}</p>
                <p><strong>القيمة الجديدة:</strong> {
                  selectedRequest.field_name === "password" || selectedRequest.field_name === "withdrawal_pin"
                    ? selectedRequest.new_value
                    : selectedRequest.new_value
                }</p>
              </div>

              <div className="space-y-2">
                <Label>ملاحظة (اختياري)</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="سبب الرفض أو ملاحظة..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleProcess(true)}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 ml-1" />}
                  موافقة
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleProcess(false)}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 ml-1" />}
                  رفض
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
