import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, User, Phone, Mail, DollarSign, Edit, Crown, Calendar, Target, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  account_type: "beginner" | "vip1" | "vip2" | "vip3";
  balance: number;
  total_earnings: number;
  created_at: string;
  daily_attempts_count: number;
  last_attempt_date: string | null;
}

interface PackageOption {
  account_type: string;
  name: string;
}

export const AdminUsersTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newAccountType, setNewAccountType] = useState<string>("");
  const [newBalance, setNewBalance] = useState<string>("");
  const [newTotalEarnings, setNewTotalEarnings] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    const { data } = await supabase
      .from("packages")
      .select("account_type, name")
      .eq("is_active", true)
      .order("price", { ascending: true });
    
    if (data) {
      setPackageOptions(data);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      toast.error("حدث خطأ في تحميل المستخدمين");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery)
  );

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);

    try {
      const updates: any = {};
      
      if (newAccountType && newAccountType !== selectedUser.account_type) {
        updates.account_type = newAccountType;
      }
      
      if (newBalance !== "" && parseFloat(newBalance) !== selectedUser.balance) {
        updates.balance = parseFloat(newBalance);
        if (selectedUser.account_type === "beginner" && parseFloat(newBalance) >= 100) {
          updates.is_package_activated = true;
        }
      }
      
      if (newTotalEarnings !== "" && parseFloat(newTotalEarnings) !== selectedUser.total_earnings) {
        updates.total_earnings = parseFloat(newTotalEarnings);
      }

      if (newEmail && newEmail !== selectedUser.email) {
        updates.email = newEmail;
      }

      if (newPhone && newPhone !== selectedUser.phone) {
        updates.phone = newPhone;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", selectedUser.id);

        if (error) throw error;
      }

      // Update password if provided
      if (newPassword && newPassword.length >= 6) {
        const { data: passwordResult, error: passwordError } = await supabase.functions.invoke(
          "update-user-password",
          {
            body: { userId: selectedUser.id, newPassword },
          }
        );
        
        if (passwordError) {
          toast.error("فشل في تحديث كلمة المرور");
          console.error("Password update error:", passwordError);
        } else {
          toast.success("تم تحديث كلمة المرور بنجاح");
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("activity_logs").insert({
          user_id: selectedUser.id,
          action: "تعديل بيانات المستخدم من الإدارة",
          details: { 
            changes: updates,
            admin_action: true 
          },
          amount: updates.balance || updates.total_earnings || null,
        });

        toast.success("تم تحديث البيانات بنجاح");
        fetchUsers();
      }

      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("حدث خطأ في تحديث البيانات");
    } finally {
      setIsUpdating(false);
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "beginner": return "مبتدئ";
      case "vip1": return "VIP 1";
      case "vip2": return "VIP 2";
      case "vip3": return "VIP 3";
      default: return type;
    }
  };

  const getAccountTypeBadgeClass = (type: string) => {
    switch (type) {
      case "vip1": return "bg-vip-gold/20 text-vip-gold";
      case "vip2": return "bg-vip-platinum/20 text-vip-platinum";
      case "vip3": return "bg-vip-diamond/20 text-vip-diamond";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const openEditDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setNewAccountType(user.account_type);
    setNewBalance(user.balance.toString());
    setNewTotalEarnings(user.total_earnings.toString());
    setNewEmail(user.email || "");
    setNewPhone(user.phone || "");
    setNewPassword("");
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
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="البحث بالاسم أو البريد أو الهاتف..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{user.full_name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getAccountTypeBadgeClass(user.account_type)}`}>
                      {getAccountTypeLabel(user.account_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user.email || "لا يوجد"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {user.phone || "لا يوجد"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="flex items-center gap-1 text-emerald">
                      <DollarSign className="w-3 h-3" />
                      الرصيد: {user.balance} ج
                    </span>
                    <span className="flex items-center gap-1 text-vip-gold">
                      <Crown className="w-3 h-3" />
                      الأرباح: {user.total_earnings} ج
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <Target className="w-3 h-3" />
                      المحاولات: {user.daily_attempts_count}/3
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      آخر محاولة: {user.last_attempt_date || "لا يوجد"}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(user)}
              >
                <Edit className="w-4 h-4 ml-1" />
                تعديل
              </Button>
            </div>
          </motion.div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            لا يوجد مستخدمين
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">البيانات العامة</TabsTrigger>
                <TabsTrigger value="credentials">بيانات الدخول</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                  <p><strong>الاسم:</strong> {selectedUser.full_name}</p>
                  <p><strong>رقم العضوية:</strong> {selectedUser.id.slice(0, 8)}</p>
                </div>

                <div className="space-y-2">
                  <Label>الباقة</Label>
                  <Select value={newAccountType} onValueChange={setNewAccountType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {packageOptions.map((pkg) => (
                        <SelectItem key={pkg.account_type} value={pkg.account_type}>
                          {pkg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الرصيد الحالي (جنيه)</Label>
                  <Input
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    placeholder="أدخل الرصيد"
                  />
                </div>

                <div className="space-y-2">
                  <Label>إجمالي الأرباح (جنيه)</Label>
                  <Input
                    type="number"
                    value={newTotalEarnings}
                    onChange={(e) => setNewTotalEarnings(e.target.value)}
                    placeholder="أدخل إجمالي الأرباح"
                  />
                </div>
              </TabsContent>

              <TabsContent value="credentials" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    البريد الإلكتروني
                  </Label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="أدخل البريد الإلكتروني"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    رقم الهاتف
                  </Label>
                  <Input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="أدخل رقم الهاتف"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    كلمة المرور الجديدة
                  </Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                  />
                  <p className="text-xs text-muted-foreground">
                    اترك الحقل فارغاً إذا لم ترد تغيير كلمة المرور
                  </p>
                </div>
              </TabsContent>

              <Button className="w-full mt-4" onClick={handleUpdateUser} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  "حفظ التغييرات"
                )}
              </Button>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};