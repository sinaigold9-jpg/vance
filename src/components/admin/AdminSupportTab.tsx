import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, User, Mail, Phone, IdCard, Star, 
  Clock, CheckCircle2, Send, Loader2, XCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface SupportTicket {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  membership_id: string | null;
  ticket_type: string;
  rating: number | null;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export const AdminSupportTab = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("حدث خطأ في تحميل التذاكر");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim() || !user) return;

    setIsReplying(true);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          admin_reply: replyText.trim(),
          status: "replied",
          replied_at: new Date().toISOString(),
          replied_by: user.id,
        })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      toast.success("تم إرسال الرد بنجاح");
      setSelectedTicket(null);
      setReplyText("");
      fetchTickets();
    } catch (error) {
      console.error("Error replying:", error);
      toast.error("حدث خطأ أثناء إرسال الرد");
    } finally {
      setIsReplying(false);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "closed" })
        .eq("id", ticketId);

      if (error) throw error;

      toast.success("تم إغلاق التذكرة");
      fetchTickets();
    } catch (error) {
      console.error("Error closing ticket:", error);
      toast.error("حدث خطأ أثناء إغلاق التذكرة");
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "complaint": return "شكوى";
      case "inquiry": return "استفسار";
      case "suggestion": return "اقتراح";
      case "rating": return "تقييم";
      default: return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "complaint": return "bg-red-500/10 text-red-500";
      case "inquiry": return "bg-blue-500/10 text-blue-500";
      case "suggestion": return "bg-green-500/10 text-green-500";
      case "rating": return "bg-yellow-500/10 text-yellow-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500">قيد الانتظار</Badge>;
      case "replied":
        return <Badge className="bg-green-500/10 text-green-500">تم الرد</Badge>;
      case "closed":
        return <Badge className="bg-muted text-muted-foreground">مغلقة</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">الدعم الفني والتذاكر</h3>
        <Badge variant="outline">{tickets.length} تذكرة</Badge>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد تذاكر حالياً</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={getTypeBadgeClass(ticket.ticket_type)}>
                    {getTypeLabel(ticket.ticket_type)}
                  </Badge>
                  {getStatusBadge(ticket.status)}
                  {ticket.ticket_type === "rating" && ticket.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < ticket.rating! 
                              ? "fill-yellow-400 text-yellow-400" 
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(ticket.created_at)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-primary" />
                  <span className="truncate">{ticket.full_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-primary" />
                  <span className="truncate">{ticket.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-primary" />
                  <span>{ticket.phone}</span>
                </div>
                <div className="flex items-center gap-1">
                  <IdCard className="w-3 h-3 text-primary" />
                  <span>{ticket.membership_id || "---"}</span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 mb-3">
                <p className="text-sm">{ticket.message}</p>
              </div>

              {ticket.admin_reply && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-3">
                  <p className="text-xs text-primary font-bold mb-1">رد الإدارة:</p>
                  <p className="text-sm">{ticket.admin_reply}</p>
                </div>
              )}

              <div className="flex gap-2">
                {ticket.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setReplyText(ticket.admin_reply || "");
                    }}
                    className="bg-primary text-primary-foreground"
                  >
                    <Send className="w-4 h-4 ml-1" />
                    رد
                  </Button>
                )}
                {ticket.status !== "closed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCloseTicket(ticket.id)}
                  >
                    <XCircle className="w-4 h-4 ml-1" />
                    إغلاق
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>الرد على التذكرة</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">رسالة المستخدم:</p>
                <p className="text-sm">{selectedTicket.message}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ردك</label>
                <Textarea
                  placeholder="اكتب ردك هنا..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              <Button
                onClick={handleReply}
                disabled={isReplying || !replyText.trim()}
                className="w-full bg-gradient-gold text-primary-foreground"
              >
                {isReplying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 ml-2" />
                    إرسال الرد
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
