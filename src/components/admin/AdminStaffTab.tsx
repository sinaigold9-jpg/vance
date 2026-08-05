import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  UserPlus, Shield, Trash2, Edit, Search, 
  Users, DollarSign, Package, Bell, Gift, 
  HeadphonesIcon, MessageCircle, Bot, Power, Clock, 
  Key, Mail, FileUp, Edit3
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface StaffMember {
  id: string;
  user_id: string;
  role_title: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  profiles?: { full_name: string; email: string; membership_id: string };
}

const PERMISSION_TABS = [
  { key: "users", label: "المستخدمين", icon: Users },
  { key: "upgrades", label: "الترقيات", icon: FileUp },
  { key: "transactions", label: "المعاملات", icon: DollarSign },
  { key: "packages", label: "الباقات", icon: Package },
  { key: "notifications", label: "الإشعارات", icon: Bell },
  { key: "promotions", label: "العروض", icon: Gift },
  { key: "support", label: "الدعم", icon: HeadphonesIcon },
  { key: "chat", label: "المحادثات", icon: MessageCircle },
  { key: "bot", label: "البوت", icon: Bot },
  { key: "app-settings", label: "التحكم", icon: Power },
  { key: "activity", label: "النشاطات", icon: Clock },
  { key: "export", label: "التصدير", icon: Key },
  { key: "change-requests", label: "طلبات التعديل", icon: Edit3 },
  { key: "email-management", label: "البريد", icon: Mail },
  { key: "offers-contests", label: "العروض والمسابقات", icon: Gift },
  { key: "internal-links", label: "الروابط", icon: Key },
];

const ROLE_PRESETS = [
  { title: "مدير", permissions: PERMISSION_TABS.map(t => t.key) },
  { title: "رئيس قسم العروض", permissions: ["promotions", "offers-contests", "notifications"] },
  { title: "مسؤول الدعم الفني", permissions: ["support", "chat", "notifications"] },
  { title: "مسؤول المعاملات", permissions: ["transactions", "upgrades"] },
  { title: "مسؤول المستخدمين", permissions: ["users", "change-requests"] },
  { title: "موظف", permissions: [] },
];

export const AdminStaffTab = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("موظف");
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("staff_members")
      .select(`*, profiles:user_id (full_name, email, membership_id)`)
      .order("created_at", { ascending: false });

    if (data) setStaff(data as any);
    setIsLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }
    if (invitePermissions.length === 0) {
      toast.error("يرجى اختيار صلاحية واحدة على الأقل");
      return;
    }

    setInviting(true);
    try {
      // Find user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", inviteEmail.trim())
        .maybeSingle();

      if (!profile) {
        toast.error("لم يتم العثور على مستخدم بهذا البريد الإلكتروني");
        setInviting(false);
        return;
      }

      // Check if already staff
      const { data: existing } = await supabase
        .from("staff_members")
        .select("id")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (existing) {
        toast.error("هذا المستخدم موظف بالفعل");
        setInviting(false);
        return;
      }

      // Add as staff
      const { error } = await supabase.from("staff_members").insert({
        user_id: profile.id,
        invited_by: user!.id,
        role_title: inviteRole,
        permissions: invitePermissions,
        is_active: true,
      });

      if (error) throw error;

      // Send notification as incoming message
      const permLabels = invitePermissions.map(p => 
        PERMISSION_TABS.find(t => t.key === p)?.label || p
      ).join("، ");

      await supabase.from("notifications").insert({
        user_id: profile.id,
        title: "🎉 تم تعيينك كموظف في الإدارة",
        message: `مرحباً ${profile.full_name}!\n\nتم تعيينك بمنصب "${inviteRole}" في لوحة الإدارة.\n\nالأقسام المتاحة لك: ${permLabels}\n\nيمكنك الآن الدخول إلى لوحة التحكم من الملف الشخصي.`,
        type: "private_message",
      });

      toast.success(`تم تعيين ${profile.full_name} كموظف بنجاح`);
      setShowInvite(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    }
    setInviting(false);
  };

  const handleUpdatePermissions = async () => {
    if (!editStaff) return;
    try {
      const { error } = await supabase
        .from("staff_members")
        .update({
          role_title: inviteRole,
          permissions: invitePermissions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editStaff.id);

      if (error) throw error;

      // Notify staff member
      const permLabels = invitePermissions.map(p => 
        PERMISSION_TABS.find(t => t.key === p)?.label || p
      ).join("، ");

      await supabase.from("notifications").insert({
        user_id: editStaff.user_id,
        title: "تم تحديث صلاحياتك",
        message: `تم تحديث منصبك إلى "${inviteRole}".\n\nالأقسام المتاحة: ${permLabels}`,
        type: "private_message",
      });

      toast.success("تم تحديث الصلاحيات");
      setEditStaff(null);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    const newActive = !member.is_active;
    await supabase
      .from("staff_members")
      .update({ is_active: newActive })
      .eq("id", member.id);

    await supabase.from("notifications").insert({
      user_id: member.user_id,
      title: newActive ? "تم تفعيل حسابك كموظف" : "تم تعطيل حسابك كموظف",
      message: newActive 
        ? "تم إعادة تفعيل صلاحياتك في لوحة الإدارة." 
        : "تم تعطيل صلاحياتك في لوحة الإدارة مؤقتاً.",
      type: "private_message",
    });

    toast.success(newActive ? "تم تفعيل الموظف" : "تم تعطيل الموظف");
    fetchStaff();
  };

  const handleRemove = async (member: StaffMember) => {
    await supabase.from("staff_members").delete().eq("id", member.id);

    await supabase.from("notifications").insert({
      user_id: member.user_id,
      title: "تم إزالتك من فريق الإدارة",
      message: "تم إزالة صلاحياتك كموظف في لوحة الإدارة.",
      type: "private_message",
    });

    toast.success("تم إزالة الموظف");
    fetchStaff();
  };

  const resetForm = () => {
    setInviteEmail("");
    setInviteRole("موظف");
    setInvitePermissions([]);
  };

  const openEdit = (member: StaffMember) => {
    setEditStaff(member);
    setInviteRole(member.role_title);
    setInvitePermissions(member.permissions);
  };

  const applyPreset = (presetTitle: string) => {
    const preset = ROLE_PRESETS.find(r => r.title === presetTitle);
    if (preset) {
      setInviteRole(preset.title);
      setInvitePermissions([...preset.permissions]);
    }
  };

  const togglePermission = (key: string) => {
    setInvitePermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const filteredStaff = staff.filter(s =>
    s.profiles?.full_name?.includes(searchQuery) ||
    s.profiles?.email?.includes(searchQuery) ||
    s.role_title.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">إدارة الموظفين</h2>
          <p className="text-sm text-muted-foreground">{staff.length} موظف</p>
        </div>
        <Button onClick={() => { resetForm(); setShowInvite(true); }} className="gap-2">
          <UserPlus className="w-4 h-4" />
          دعوة موظف
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو البريد..."
          className="pr-10"
        />
      </div>

      {/* Staff List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-card/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredStaff.length > 0 ? (
        <div className="space-y-3">
          {filteredStaff.map(member => (
            <Card key={member.id} className={`border-border/50 ${!member.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold">{member.profiles?.full_name}</h3>
                      <Badge variant="outline" className="gap-1">
                        <Shield className="w-3 h-3" />
                        {member.role_title}
                      </Badge>
                      {!member.is_active && (
                        <Badge variant="destructive" className="text-xs">معطل</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {member.profiles?.email} • منذ {format(new Date(member.created_at), "dd MMM yyyy", { locale: ar })}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(member.permissions as string[]).map(p => {
                        const tab = PERMISSION_TABS.find(t => t.key === p);
                        return tab ? (
                          <Badge key={p} variant="secondary" className="text-xs gap-1">
                            <tab.icon className="w-3 h-3" />
                            {tab.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => openEdit(member)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant={member.is_active ? "secondary" : "default"}
                      onClick={() => handleToggleActive(member)}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleRemove(member)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card/50 rounded-xl">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا يوجد موظفين بعد</p>
          <p className="text-sm text-muted-foreground mt-1">اضغط "دعوة موظف" لإضافة أعضاء لفريق الإدارة</p>
        </div>
      )}

      {/* Invite / Edit Dialog */}
      <Dialog open={showInvite || !!editStaff} onOpenChange={(open) => {
        if (!open) { setShowInvite(false); setEditStaff(null); resetForm(); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editStaff ? "تعديل صلاحيات الموظف" : "دعوة موظف جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editStaff && (
              <div>
                <Label>البريد الإلكتروني للموظف</Label>
                <Input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="example@email.com"
                  type="email"
                  className="mt-1"
                />
              </div>
            )}

            {editStaff && (
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="font-medium">{editStaff.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">{editStaff.profiles?.email}</p>
              </div>
            )}

            <div>
              <Label>المنصب</Label>
              <Select value={inviteRole} onValueChange={(val) => {
                setInviteRole(val);
                applyPreset(val);
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_PRESETS.map(r => (
                    <SelectItem key={r.title} value={r.title}>{r.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">اختر منصب جاهز أو خصص الصلاحيات يدوياً</p>
            </div>

            <div>
              <Label className="mb-2 block">الصلاحيات (الأقسام المتاحة)</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_TABS.map(tab => (
                  <label
                    key={tab.key}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      invitePermissions.includes(tab.key)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-secondary/50'
                    }`}
                  >
                    <Checkbox
                      checked={invitePermissions.includes(tab.key)}
                      onCheckedChange={() => togglePermission(tab.key)}
                    />
                    <tab.icon className="w-4 h-4" />
                    <span className="text-sm">{tab.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setInvitePermissions(PERMISSION_TABS.map(t => t.key))}
                variant="outline"
                size="sm"
              >
                تحديد الكل
              </Button>
              <Button
                onClick={() => setInvitePermissions([])}
                variant="outline"
                size="sm"
              >
                إلغاء الكل
              </Button>
            </div>

            <Button
              onClick={editStaff ? handleUpdatePermissions : handleInvite}
              disabled={inviting}
              className="w-full"
            >
              {inviting ? "جاري الإضافة..." : editStaff ? "حفظ التعديلات" : "إرسال الدعوة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
