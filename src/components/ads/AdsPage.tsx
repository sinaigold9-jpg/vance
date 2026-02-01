import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdCard } from "./AdCard";
import { CreateAdForm } from "./CreateAdForm";
import { AD_CATEGORIES } from "./AdCategories";
import { Plus, Search, Filter, Megaphone, Clock, Archive, FileEdit } from "lucide-react";

interface Advertisement {
  id: string;
  title: string;
  short_description: string;
  full_description: string | null;
  external_link: string | null;
  category: string;
  ad_type: string;
  status: string;
  images: string[];
  views_count: number;
  clicks_count: number;
  created_at: string;
  user_id: string;
}

interface AdsPageProps {
  userBalance: number;
}

export const AdsPage = ({ userBalance }: AdsPageProps) => {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [myAds, setMyAds] = useState<Advertisement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAds();
    if (user) {
      fetchMyAds();
    }
  }, [user]);

  const fetchAds = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("advertisements")
      .select("*")
      .eq("status", "approved")
      .order("priority_level", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) setAds(data as any);
    setIsLoading(false);
  };

  const fetchMyAds = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("advertisements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setMyAds(data as any);
  };

  const filteredAds = ads.filter(ad => {
    const matchesSearch = ad.title.includes(searchQuery) || 
                         ad.short_description.includes(searchQuery);
    const matchesCategory = categoryFilter === "all" || ad.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSuccess = () => {
    setShowCreateForm(false);
    fetchAds();
    fetchMyAds();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" className="gap-1"><FileEdit className="w-3 h-3" />مسودة</Badge>;
      case "pending":
        return <Badge variant="outline" className="gap-1 border-amber-500 text-amber-500"><Clock className="w-3 h-3" />قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="gap-1 bg-accent"><Megaphone className="w-3 h-3" />منشور</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1">مرفوض</Badge>;
      case "archived":
        return <Badge variant="secondary" className="gap-1"><Archive className="w-3 h-3" />مؤرشف</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {showCreateForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CreateAdForm
              onSuccess={handleSuccess}
              onCancel={() => setShowCreateForm(false)}
              userBalance={userBalance}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">الإعلانات</h2>
                <p className="text-sm text-muted-foreground">تصفح الإعلانات واكسب نقاط</p>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="all">جميع الإعلانات</TabsTrigger>
                <TabsTrigger value="my">إعلاناتي</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-4">
                {/* Search & Filter */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="ابحث في الإعلانات..."
                      className="pr-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 ml-2" />
                      <SelectValue placeholder="الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفئات</SelectItem>
                      {AD_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ads Grid */}
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-60 bg-card/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredAds.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAds.map(ad => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        isOwner={ad.user_id === user?.id}
                        onRefresh={fetchAds}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-card/50 rounded-xl">
                    <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">لا توجد إعلانات حالياً</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="my" className="space-y-4 mt-4">
                {!user ? (
                  <div className="text-center py-12 bg-card/50 rounded-xl">
                    <p className="text-muted-foreground">يرجى تسجيل الدخول لعرض إعلاناتك</p>
                  </div>
                ) : myAds.length > 0 ? (
                  <div className="space-y-4">
                    {/* Status Filter for My Ads */}
                    <div className="flex flex-wrap gap-2">
                      {["all", "draft", "pending", "approved", "archived"].map(status => (
                        <Badge
                          key={status}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                        >
                          {status === "all" ? "الكل" : 
                           status === "draft" ? "مسودة" :
                           status === "pending" ? "قيد المراجعة" :
                           status === "approved" ? "منشور" : "مؤرشف"}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myAds.map(ad => (
                        <div key={ad.id} className="relative">
                          <div className="absolute top-2 left-2 z-10">
                            {getStatusBadge(ad.status)}
                          </div>
                          <AdCard
                            ad={ad}
                            isOwner={true}
                            onRefresh={() => {
                              fetchAds();
                              fetchMyAds();
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-card/50 rounded-xl">
                    <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">لم تنشئ أي إعلانات بعد</p>
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      className="gap-2 bg-gradient-gold text-primary-foreground"
                    >
                      <Plus className="w-4 h-4" />
                      إنشاء أول إعلان
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
