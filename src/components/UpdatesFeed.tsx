import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UpdatePost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
}

export const UpdatesFeed = () => {
  const [posts, setPosts] = useState<UpdatePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("update_posts" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      setPosts(((data as any) || []) as UpdatePost[]);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("update-posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "update_posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">لا توجد تحديثات جديدة حالياً</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, i) => (
        <motion.article
          key={post.id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-card shadow-card"
        >
          {post.video_url ? (
            <div className="relative bg-black">
              <video
                src={post.video_url}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-72 object-cover"
                poster={post.image_url || undefined}
              />
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-amber-300 text-[10px] font-bold flex items-center gap-1">
                <Play className="w-3 h-3 fill-amber-300" />
                فيديو
              </div>
            </div>
          ) : post.image_url ? (
            <img
              src={post.image_url}
              alt={post.title}
              loading="lazy"
              className="w-full max-h-72 object-cover"
            />
          ) : null}

          <div className="p-4 space-y-2">
            <h3 className="text-base font-bold text-foreground leading-snug">{post.title}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{post.content}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 pt-1">
              <Calendar className="w-3 h-3" />
              {new Date(post.created_at).toLocaleDateString("ar-EG", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
};