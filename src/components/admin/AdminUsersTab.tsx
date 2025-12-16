import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, User, Phone, Mail, Package, DollarSign, Edit, Crown } from "lucide-react";
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

interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  account_type: "beginner" | "vip1" | "vip2" | "vip3";
  balance: number;
  total_earnings: number;
  created_at: string;
}

export const AdminUsersTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newAccountType, setNewAccountType] = useState<string>("");
  const [newBalance, setNewBalance] = useState<string>("");
  const [newTotalEarnings, setNewTotalEarnings] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

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

    const updates: any = {};
    
    if (newAccountType && newAccountType !== selectedUser.account_type) {
      updates.account_type = newAccountType;
    }
    
    if (newBalance !== "" && parseFloat(newBalance) !== selectedUser.balance) {
      updates.balance = parseFloat(newBalance);
    }
    
    if (newTotalEarnings !== "" && parseFloat(newTotalEarnings) !== selectedUser.total_earnings) {
      updates.total_earnings = parseFloat(newTotalEarnings);
    }

    if (Object.keys(updates).length === 0) {
      toast.info("لم يتم إجراء أي تغييرات");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", selectedUser.id);

    if (error) {
      toast.error("حدث خطأ في تحديث البيانات");
      console.error("Error updating user:", error);
    } else {
      toast.success("تم تحديث البيانات بنجاح");
      
      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: selectedUser.id,
        action: "تعديل بيانات المستخدم من الإدارة",
        details: { 
          changes: updates,
          admin_action: true 
        },
        amount: updates.balance || updates.total_earnings || null,
      });

      fetchUsers();
      setSelectedUser(null);
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
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-emerald">
                      <DollarSign className="w-3 h-3" />
                      الرصيد: {user.balance} ج
                    </span>
                    <span className="flex items-center gap-1 text-vip-gold">
                      <Crown className="w-3 h-3" />
                      الأرباح: {user.total_earnings} ج
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                <p><strong>الاسم:</strong> {selectedUser.full_name}</p>
                <p><strong>البريد:</strong> {selectedUser.email}</p>
                <p><strong>الهاتف:</strong> {selectedUser.phone}</p>
                <p><strong>رقم العضوية:</strong> {selectedUser.id.slice(0, 8)}</p>
              </div>

              <div className="space-y-2">
                <Label>الباقة</Label>
                <Select value={newAccountType} onValueChange={setNewAccountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">مبتدئ</SelectItem>
                    <SelectItem value="vip1">VIP 1</SelectItem>
                    <SelectItem value="vip2">VIP 2</SelectItem>
                    <SelectItem value="vip3">VIP 3</SelectItem>
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

              <Button className="w-full" onClick={handleUpdateUser}>
                حفظ التغييرات
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
