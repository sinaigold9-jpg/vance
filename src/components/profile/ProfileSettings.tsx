import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Bell, BellOff, Edit, User, Mail, Phone, Key, Lock, Clock, CheckCircle, XCircle, Loader2, Wifi, BatteryCharging, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { registerPushNotifications, unregisterPushNotifications } from "@/lib/pushNotifications";
import { useDataSaver } from "@/hooks/useDataSaver";
import { toast } from "sonner";

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChangeRequest {
  id: string;
  field_name: string;
  new_value: string;
  status: string;
  admin_note: string | null;
  created_at: string;
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

export const ProfileSettings = ({ isOpen, onClose }: ProfileSettingsProps) => {
  const { user } = useAuth();
  const { enabled: dataSaver, toggle: toggleDataSaver } = useDataSaver();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [batteryOptDisabled, setBatteryOptDisabled] = useState<boolean>(() => {
    try { return localStorage.getItem("advance_battery_opt_off") === "1"; } catch { return false; }
  });
  const [showBatteryHelp, setShowBatteryHelp] = useState(false);
  const [selectedField, setSelectedField] = useState<string>("");
  const [newValue, setNewValue] = useState("");
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      checkPushStatus();
      fetchRequests();
    }
  }, [isOpen, user]);

  const checkPushStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
      if (reg) {
        const sub = await (reg as any).pushManager.getSubscription();
        setPushEnabled(!!sub);
      }
    } catch { setPushEnabled(false); }
  };

  const togglePush = async () => {
    if (!user) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unregisterPushNotifications();
        setPushEnabled(false);
        toast.success("تم إيقاف الإشعارات");
      } else {
        const result = await registerPushNotifications(user.id);
        if (result.ok) {
          setPushEnabled(true);
          toast.success("تم تفعيل الإشعارات");
        } else {
          toast.error(result.message || "فشل تفعيل الإشعارات");
        }
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setPushLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!user) return;
    setLoadingRequests(true);
    const { data } = await supabase
      .from("profile_change_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setRequests(data as ChangeRequest[]);
    setLoadingRequests(false);
  };

  const handleSubmitRequest = async () => {
    if (!user || !selectedField || !newValue.trim()) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    // Validate based on field
    if (selectedField === "email" && !newValue.includes("@")) {
      toast.error("البريد الإلكتروني غير صالح");
      return;
    }
    if (selectedField === "password" && newValue.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (selectedField === "withdrawal_pin" && (newValue.length < 4 || newValue.length > 6)) {
      toast.error("كلمة مرور السحب يجب أن تكون 4-6 أرقام");
      return;
    }

    // Check for pending request on same field
    const hasPending = requests.some(r => r.field_name === selectedField && r.status === "pending");
    if (hasPending) {
      toast.error("لديك طلب تعديل معلق لهذا الحقل بالفعل");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("profile_change_requests").insert({
        user_id: user.id,
        field_name: selectedField,
        new_value: newValue.trim(),
      });

      if (error) throw error;

      toast.success("تم إرسال طلب التعديل للإدارة");
      setShowChangeDialog(false);
      setSelectedField("");
      setNewValue("");
      fetchRequests();
    } catch {
      toast.error("حدث خطأ في إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-emerald-500/20 text-emerald-500 gap-1"><CheckCircle className="w-3 h-3" />تمت الموافقة</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />مرفوض</Badge>;
      default:
        return null;
    }
  };

  const getInputType = () => {
    switch (selectedField) {
      case "email": return "email";
      case "phone": return "tel";
      case "password":
      case "withdrawal_pin": return "password";
      default: return "text";
    }
  };

  const getPlaceholder = () => {
    switch (selectedField) {
      case "full_name": return "أدخل الاسم الجديد";
      case "email": return "أدخل البريد الإلكتروني الجديد";
      case "phone": return "أدخل رقم الهاتف الجديد";
      case "password": return "أدخل كلمة المرور الجديدة (6 أحرف على الأقل)";
      case "withdrawal_pin": return "أدخل كلمة مرور السحب الجديدة (4-6 أرقام)";
      default: return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            الإعدادات
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Push Notifications Toggle */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {pushEnabled ? (
                    <Bell className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">إشعارات التطبيق</p>
                    <p className="text-xs text-muted-foreground">
                      {pushEnabled ? "الإشعارات مفعلة" : "الإشعارات متوقفة"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={togglePush}
                  disabled={pushLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Saver */}
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi className={`w-5 h-5 ${dataSaver ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-medium">وضع توفير البيانات</p>
                    <p className="text-xs text-muted-foreground">
                      {dataSaver ? "مفعّل — يقلل تحميل الصور والمؤثرات" : "متوقف"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={dataSaver}
                  onCheckedChange={(v) => {
                    toggleDataSaver(v);
                    toast.success(v ? "تم تفعيل وضع توفير البيانات" : "تم إيقاف وضع توفير البيانات");
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Battery Optimization */}
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BatteryCharging className={`w-5 h-5 ${batteryOptDisabled ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-medium">إيقاف تحسين البطارية (أندرويد)</p>
                    <p className="text-xs text-muted-foreground">
                      {batteryOptDisabled ? "مفعّل — تصل الإشعارات فوراً" : "قد تتأخر الإشعارات في الخلفية"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={batteryOptDisabled}
                  onCheckedChange={(v) => {
                    setBatteryOptDisabled(v);
                    try { localStorage.setItem("advance_battery_opt_off", v ? "1" : "0"); } catch {}
                    if (v) setShowBatteryHelp(true);
                    toast.success(v ? "افتح الإعدادات لإتمام الاستثناء" : "تم الإيقاف");
                  }}
                />
              </div>
              <button
                onClick={() => setShowBatteryHelp(true)}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <Info className="w-3 h-3" />
                كيف أستثني التطبيق من تحسين البطارية؟
              </button>
            </CardContent>
          </Card>

          {showBatteryHelp && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-4 space-y-2 text-sm">
                <p className="font-bold">خطوات إيقاف تحسين البطارية (Android):</p>
                <ol className="list-decimal pr-4 space-y-1 text-xs text-muted-foreground">
                  <li>افتح <b>إعدادات الهاتف</b> ← <b>البطارية</b>.</li>
                  <li>اختر <b>تحسين البطارية</b> أو <b>Battery optimization</b>.</li>
                  <li>ابحث عن تطبيق <b>Advance</b> (أو المتصفح الذي ثبّت منه التطبيق).</li>
                  <li>اختر <b>عدم التحسين</b> / <b>Don't optimize</b>.</li>
                  <li>عد إلى التطبيق — الإشعارات الآن ستصلك حتى لو كان مغلقاً.</li>
                </ol>
                <p className="text-[11px] text-muted-foreground mt-2">
                  على iPhone: الإشعارات تعمل تلقائياً بعد الموافقة، لا يوجد إعداد بطارية إضافي.
                </p>
                <Button size="sm" variant="outline" onClick={() => setShowBatteryHelp(false)} className="mt-2">
                  فهمت
                </Button>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Account Change Request */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Edit className="w-4 h-4" />
                طلب تعديل معلومات الحساب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                اختر البيانات التي تريد تعديلها، وسيتم تحديثها بعد موافقة الإدارة.
              </p>
              <Button
                onClick={() => setShowChangeDialog(true)}
                className="w-full"
                variant="outline"
              >
                <Edit className="w-4 h-4 ml-2" />
                طلب تعديل جديد
              </Button>
            </CardContent>
          </Card>

          {/* Previous Requests */}
          {!loadingRequests && requests.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">طلباتك السابقة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-secondary/30 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {fieldIcons[req.field_name]}
                        <span className="text-sm font-medium">
                          {fieldLabels[req.field_name] || req.field_name}
                        </span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.field_name === "password" || req.field_name === "withdrawal_pin"
                        ? "••••••"
                        : req.new_value}
                    </p>
                    {req.admin_note && (
                      <p className="text-xs text-destructive">{req.admin_note}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Change Request Dialog */}
        <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>طلب تعديل بيانات</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اختر البيانات المراد تعديلها</Label>
                <Select value={selectedField} onValueChange={(v) => { setSelectedField(v); setNewValue(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحقل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_name">اسم المستخدم</SelectItem>
                    <SelectItem value="email">البريد الإلكتروني</SelectItem>
                    <SelectItem value="phone">رقم الهاتف</SelectItem>
                    <SelectItem value="password">كلمة المرور</SelectItem>
                    <SelectItem value="withdrawal_pin">كلمة مرور السحب</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedField && (
                <div className="space-y-2">
                  <Label>القيمة الجديدة</Label>
                  <Input
                    type={getInputType()}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={getPlaceholder()}
                    dir={selectedField === "email" || selectedField === "phone" ? "ltr" : "rtl"}
                  />
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSubmitRequest}
                disabled={submitting || !selectedField || !newValue.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  "إرسال الطلب"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
