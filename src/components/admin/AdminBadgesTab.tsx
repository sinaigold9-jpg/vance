import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus, Search, X, Award, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
}

interface UserRow {
  id: string;
  full_name: string;
  membership_id: string;
  email: string | null;
}

export const AdminBadgesTab = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", icon: "🏅", color: "#FFD700", description: "" });
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userBadges, setUserBadges] = useState<{ id: string; badge: Badge }[]>([]);

  const fetchBadges = async () => {
    setLoading(true);
    const { data } = await supabase.from("badges").select("*").order("created_at", { ascending: false });
    setBadges((data || []) as Badge[]);
    setLoading(false);
  };

  useEffect(() => { fetchBadges(); }, []);

  const createBadge = async () => {
    if (!form.name.trim()) { toast.error("الاسم مطلوب"); return; }
    setSaving(true);
    const { error } = await supabase.from("badges").insert({
      name: form.name.trim(),
      icon: form.icon || "🏅",
      color: form.color || "#FFD700",
      description: form.description.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error("فشل إنشاء الوسام"); return; }
    toast.success("تم إنشاء الوسام");
    setForm({ name: "", icon: "🏅", color: "#FFD700", description: "" });
    fetchBadges();
  };

  const deleteBadge = async (id: string) => {
    if (!confirm("حذف الوسام؟ سيتم إزالته من جميع المستخدمين.")) return;
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error) { toast.error("فشل الحذف"); return; }
    toast.success("تم الحذف");
    fetchBadges();
  };

  const searchUsers = async () => {
    if (!search.trim()) return;
    const term = `%${search.trim()}%`;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, membership_id, email")
      .or(`full_name.ilike.${term},membership_id.ilike.${term},email.ilike.${term}`)
      .limit(15);
    setResults((data || []) as UserRow[]);
  };

  const loadUserBadges = async (u: UserRow) => {
    setSelectedUser(u);
    const { data } = await supabase
      .from("user_badges")
      .select("id, badges(*)")
      .eq("user_id", u.id);
    setUserBadges((data || []).map((r: any) => ({ id: r.id, badge: r.badges })).filter(x => x.badge));
  };

  const grantBadge = async (badgeId: string) => {
    if (!selectedUser) return;
    const { error } = await supabase.from("user_badges").insert({
      user_id: selectedUser.id,
      badge_id: badgeId,
      granted_by: user?.id,
    });
    if (error) {
      if (error.code === "23505") toast.error("المستخدم يمتلك هذا الوسام بالفعل");
      else toast.error("فشل المنح");
      return;
    }
    toast.success("تم منح الوسام");
    loadUserBadges(selectedUser);
  };

  const revokeBadge = async (userBadgeId: string) => {
    const { error } = await supabase.from("user_badges").delete().eq("id", userBadgeId);
    if (error) { toast.error("فشل السحب"); return; }
    toast.success("تم سحب الوسام");
    if (selectedUser) loadUserBadges(selectedUser);
  };

  return (
    <div className="space-y-6">
      {/* Create new badge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="w-4 h-4" /> إنشاء وسام جديد</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">الأيقونة (Emoji)</Label>
            <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🏅" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">الاسم</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="نجم شهر يناير" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">اللون</Label>
            <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label className="text-xs">الوصف (اختياري)</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <Button onClick={createBadge} disabled={saving} className="md:col-span-4">
            {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Plus className="w-4 h-4 ml-2" />}
            إنشاء
          </Button>
        </CardContent>
      </Card>

      {/* Existing badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="w-4 h-4" /> الأوسمة الحالية ({badges.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : badges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد أوسمة بعد</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {badges.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: b.color + "22", color: b.color }}>
                      {b.icon}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{b.name}</p>
                      {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteBadge(b.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant/revoke */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> منح/سحب الأوسمة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="ابحث بالاسم أو رقم العضوية أو البريد"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            />
            <Button onClick={searchUsers}><Search className="w-4 h-4" /></Button>
          </div>

          {results.length > 0 && !selectedUser && (
            <div className="grid gap-2">
              {results.map(u => (
                <button
                  key={u.id}
                  onClick={() => loadUserBadges(u)}
                  className="text-right p-3 rounded-xl border border-border hover:bg-muted/50 transition"
                >
                  <p className="font-bold text-sm">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground">{u.membership_id} · {u.email}</p>
                </button>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="space-y-3 border border-border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{selectedUser.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.membership_id}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(null); setUserBadges([]); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">أوسمة المستخدم الحالية:</p>
                {userBadges.length === 0 ? (
                  <p className="text-xs text-muted-foreground">لا توجد</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userBadges.map(ub => (
                      <BadgeUI
                        key={ub.id}
                        style={{ backgroundColor: ub.badge.color + "22", color: ub.badge.color, borderColor: ub.badge.color + "55" }}
                        className="gap-1 border cursor-pointer"
                        onClick={() => revokeBadge(ub.id)}
                      >
                        <span>{ub.badge.icon}</span> {ub.badge.name}
                        <UserMinus className="w-3 h-3 mr-1" />
                      </BadgeUI>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">امنح وسامًا:</p>
                <div className="flex flex-wrap gap-2">
                  {badges.filter(b => !userBadges.some(ub => ub.badge.id === b.id)).map(b => (
                    <Button key={b.id} variant="outline" size="sm" onClick={() => grantBadge(b.id)}>
                      <span className="ml-1">{b.icon}</span> {b.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBadgesTab;
