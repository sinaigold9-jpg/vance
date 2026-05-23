import { useEffect, useState } from "react";
import { Plus, Trash2, Power, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpdatePost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export const AdminUpdatesTab = () => {
  const [posts, setPosts] = useState<UpdatePost[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [order, setOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("update_posts" as any)
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    setPosts(((data as any) || []) as UpdatePost[]);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("العنوان والمحتوى مطلوبان");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("update_posts" as any).insert({
      title: title.trim(),
      content: content.trim(),
      image_url: imageUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      display_order: order || 0,
      created_by: u.user?.id,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم نشر التحديث");
    setTitle(""); setContent(""); setImageUrl(""); setVideoUrl(""); setOrder(0);
    load();
  };

  const toggleActive = async (p: UpdatePost) => {
    await supabase.from("update_posts" as any).update({ is_active: !p.is_active } as any).eq("id", p.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف التحديث؟")) return;
    await supabase.from("update_posts" as any).delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> نشر تحديث جديد</h3>
        <Input placeholder="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="المحتوى" rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs flex items-center gap-1 text-muted-foreground"><ImageIcon className="w-3 h-3" /> رابط الصورة (اختياري)</label>
            <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs flex items-center gap-1 text-muted-foreground"><Video className="w-3 h-3" /> رابط الفيديو القصير (اختياري)</label>
            <Input placeholder="https://...mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          </div>
        </div>
        <Input type="number" placeholder="ترتيب العرض (0 = الأحدث)" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        <Button onClick={create} disabled={saving} className="bg-gradient-gold text-primary-foreground">نشر</Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold">التحديثات الحالية ({posts.length})</h3>
        {posts.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
            {p.image_url && <img src={p.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{p.title}</div>
              <p className="text-xs text-muted-foreground line-clamp-2">{p.content}</p>
              {p.video_url && <span className="text-[10px] text-amber-400">يحتوي فيديو</span>}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
              <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                <Trash2 className="w-4 h-4 text-rose-400" />
              </Button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">لا توجد تحديثات</p>}
      </div>
    </div>
  );
};