import { PromotionBanner } from "./PromotionBanner";
import { BackButton } from "./BackButton";

export const OffersPage = () => {
  return (
    <div className="space-y-6">
      <BackButton />
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-foreground mb-2">العروض والمسابقات</h2>
        <p className="text-muted-foreground text-sm">تصفح أحدث العروض المتاحة</p>
      </div>

      {/* Show promotions targeted to offers page */}
      <PromotionBanner location="offers" />
    </div>
  );
};