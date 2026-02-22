import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Send, Users, User, Search, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Subscriber {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
  profile?: { full_name: string };
}

export const AdminEmailTab = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendType, setSendType] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("خطأ في تحميل المشتركين");
      console.error(error);
    } else if (data) {
      // Fetch profiles for each subscriber
      const userIds = data.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      setSubscribers(data.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id) as { full_name: string } | undefined,
      })));
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("يرجى ملء الموضوع والمحتوى");
      return;
    }

    if (sendType === "individual" && !selectedUserId) {
      toast.error("يرجى اختيار المستخدم");
      return;
    }

    setSending(true);
    try {
      // Save message record
      const messageData: any = {
        sender_id: (await supabase.auth.getUser()).data.user?.id,
        subject: subject.trim(),
        body: body.trim(),
        recipient_type: sendType,
      };

      if (sendType === "individual") {
        messageData.recipient_user_id = selectedUserId;
      }

      const { error } = await supabase.from("admin_messages").insert(messageData);
      if (error) throw error;

      // Send notifications to recipients
      let recipientIds: string[] = [];

      if (sendType === "all") {
        recipientIds = subscribers.map(s => s.user_id);
      } else if (sendType === "individual") {
        recipientIds = [selectedUserId];
      } else if (sendType === "subscribers") {
        recipientIds = subscribers.map(s => s.user_id);
      }

      // Create notifications for all recipients
      const notifications = recipientIds.map(userId => ({
        user_id: userId,
        title: subject.trim(),
        message: body.trim(),
        type: "email_offer",
      }));

      if (notifications.length > 0) {
        const { error: notifError } = await supabase.from("notifications").insert(notifications);
        if (notifError) console.error("Notification error:", notifError);
      }

      toast.success(`تم إرسال الرسالة إلى ${recipientIds.length} مستخدم`);
      setSubject("");
      setBody("");
      setSelectedUserId("");
    } catch (error) {
      console.error("Send error:", error);
      toast.error("حدث خطأ في الإرسال");
    } finally {
      setSending(false);
    }
  };

  const filteredSubscribers = subscribers.filter(s =>
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">إجمالي المشتركين</p>
            <p className="text-xl font-bold">{subscribers.length}</p>
          </div>
        </div>
      </div>

      {/* Send Message */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          إرسال رسالة
        </h3>

        <div className="space-y-2">
          <Label>نوع الإرسال</Label>
          <Select value={sendType} onValueChange={setSendType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> جميع المشتركين</span>
              </SelectItem>
              <SelectItem value="individual">
                <span className="flex items-center gap-2"><User className="w-4 h-4" /> مستخدم محدد</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sendType === "individual" && (
          <div className="space-y-2">
            <Label>اختر المستخدم</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مشتركاً" />
              </SelectTrigger>
              <SelectContent>
                {subscribers.map(s => (
                  <SelectItem key={s.user_id} value={s.user_id}>
                    {s.profile?.full_name || "بدون اسم"} - {s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>الموضوع</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="عنوان الرسالة"
          />
        </div>

        <div className="space-y-2">
          <Label>المحتوى</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="نص الرسالة..."
            rows={5}
          />
        </div>

        <Button onClick={handleSendMessage} disabled={sending} className="w-full">
          {sending ? (
            <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الإرسال...</>
          ) : (
            <><Send className="w-4 h-4 ml-2" /> إرسال</>
          )}
        </Button>
      </div>

      {/* Subscribers List */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            المشتركين ({subscribers.length})
          </h3>
          <Button variant="outline" size="sm" onClick={fetchSubscribers}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredSubscribers.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{sub.profile?.full_name || "بدون اسم"}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{sub.email}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(sub.created_at).toLocaleDateString("ar-EG")}
                </p>
              </motion.div>
            ))}
            {filteredSubscribers.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">لا يوجد مشتركين</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
