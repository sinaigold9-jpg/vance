import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AD_CATEGORIES, getCategoryIcon } from "./AdCategories";
import { Image, Upload, X, Eye, Loader2, Save, Send, Link } from "lucide-react";

interface CreateAdFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  userBalance: number;
}

export const CreateAdForm = ({ onSuccess, onCancel, userBalance }: CreateAdFormProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [category, setCategory] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [promotionDays, setPromotionDays] = useState(1);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const pricePerDay = 10; // 10 EGP per day for paid ads
  const totalCost = isPaid ? promotionDays * pricePerDay : 0;
  const maxFreeViews = 10;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    if (images.length + newFiles.length > 5) {
      toast.error("الحد الأقصى 5 صور");
      return;
    }

    setImages([...images, ...newFiles]);
    
    // Create preview URLs
    newFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setImageUrls(prev => [...prev, url]);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of images) {
      const fileName = `${user?.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('ad-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('ad-images')
        .getPublicUrl(data.path);
      
      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    if (!title || !shortDescription || !category) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (images.length === 0) {
      toast.error("يرجى إضافة صورة واحدة على الأقل");
      return;
    }

    if (isPaid && userBalance < totalCost) {
      toast.error("رصيدك غير كافٍ للإعلان المدفوع");
      return;
    }

    setIsLoading(true);

    try {
      // Upload images
      const uploadedImageUrls = await uploadImages();

      // Create advertisement
      const { error: adError } = await supabase.from("advertisements").insert({
        user_id: user.id,
        title,
        short_description: shortDescription,
        full_description: fullDescription,
        external_link: externalLink,
        category: category as any,
        ad_type: isPaid ? 'paid' : 'free',
        status: asDraft ? 'draft' : 'pending',
        images: uploadedImageUrls,
        max_views: isPaid ? 1000 * promotionDays : maxFreeViews,
        promotion_days: isPaid ? promotionDays : 0,
        promotion_amount: totalCost,
        priority_level: isPaid ? promotionDays : 0,
      });

      if (adError) throw adError;

      // Deduct balance for paid ads
      if (isPaid && !asDraft) {
        await supabase.from("profiles").update({
          balance: userBalance - totalCost
        }).eq("id", user.id);

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "دفع تكلفة إعلان مدفوع",
          amount: -totalCost
        });
      }

      toast.success(asDraft ? "تم حفظ الإعلان كمسودة" : "تم إرسال الإعلان للمراجعة");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء إنشاء الإعلان");
    } finally {
      setIsLoading(false);
    }
  };

  const PreviewModal = () => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">معاينة الإعلان</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {imageUrls.length > 0 && (
            <img src={imageUrls[0]} alt={title} className="w-full h-48 object-cover rounded-xl mb-4" />
          )}
          
          <h4 className="text-lg font-bold mb-2">{title || "عنوان الإعلان"}</h4>
          <p className="text-muted-foreground mb-4">{shortDescription || "وصف قصير"}</p>
          
          {fullDescription && (
            <div className="bg-secondary/50 rounded-xl p-4 mb-4">
              <p className="text-sm">{fullDescription}</p>
            </div>
          )}
          
          {category && (
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
              {getCategoryIcon(category)} {AD_CATEGORIES.find(c => c.value === category)?.label}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            إنشاء إعلان جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Images */}
          <div>
            <Label className="mb-2 block">صور الإعلان (حد أقصى 5)</Label>
            <div className="flex flex-wrap gap-3 mb-3">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative w-20 h-20">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center hover:border-primary transition-colors"
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">عنوان الإعلان *</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="أدخل عنوان الإعلان"
              maxLength={100}
            />
          </div>

          {/* Short Description */}
          <div>
            <Label htmlFor="shortDesc">وصف قصير *</Label>
            <Textarea
              id="shortDesc"
              value={shortDescription}
              onChange={e => setShortDescription(e.target.value)}
              placeholder="وصف مختصر للإعلان"
              maxLength={200}
              rows={2}
            />
          </div>

          {/* Full Description */}
          <div>
            <Label htmlFor="fullDesc">وصف تفصيلي</Label>
            <Textarea
              id="fullDesc"
              value={fullDescription}
              onChange={e => setFullDescription(e.target.value)}
              placeholder="وصف تفصيلي كامل للإعلان"
              rows={4}
            />
          </div>

          {/* External Link */}
          <div>
            <Label htmlFor="link" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              رابط خارجي
            </Label>
            <Input
              id="link"
              value={externalLink}
              onChange={e => setExternalLink(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          {/* Category */}
          <div>
            <Label>فئة الإعلان *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الفئة" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {AD_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paid Ad Toggle */}
          <div className="bg-secondary/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold">إعلان مدفوع</p>
                <p className="text-sm text-muted-foreground">زيادة الظهور والمشاهدات</p>
              </div>
              <Switch checked={isPaid} onCheckedChange={setIsPaid} />
            </div>

            {isPaid && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="space-y-4"
              >
                <div>
                  <Label>مدة الترويج (أيام)</Label>
                  <Select value={promotionDays.toString()} onValueChange={v => setPromotionDays(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 3, 7, 14, 30].map(days => (
                        <SelectItem key={days} value={days.toString()}>
                          {days} {days === 1 ? "يوم" : "أيام"} - {days * pricePerDay} جنيه
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>التكلفة الإجمالية:</span>
                  <span className="font-bold text-primary">{totalCost} جنيه</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>رصيدك الحالي:</span>
                  <span className={userBalance >= totalCost ? "text-accent" : "text-destructive"}>
                    {userBalance} جنيه
                  </span>
                </div>
              </motion.div>
            )}

            {!isPaid && (
              <p className="text-sm text-muted-foreground">
                الإعلان المجاني يظهر لـ {maxFreeViews} مستخدمين كحد أقصى
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(true)}
              disabled={!title || !shortDescription}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              معاينة
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSubmit(true)}
              disabled={isLoading}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              حفظ كمسودة
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isLoading || (isPaid && userBalance < totalCost)}
              className="gap-2 bg-gradient-gold text-primary-foreground flex-1"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              نشر الإعلان
            </Button>
          </div>

          <Button variant="ghost" onClick={onCancel} className="w-full">
            إلغاء
          </Button>
        </CardContent>
      </Card>

      {showPreview && <PreviewModal />}
    </>
  );
};
