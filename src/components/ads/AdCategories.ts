export const AD_CATEGORIES = [
  { value: 'clothes', label: 'الملابس', icon: '👕' },
  { value: 'services', label: 'الخدمات', icon: '🛠️' },
  { value: 'real_estate', label: 'العقارات', icon: '🏠' },
  { value: 'digital_products', label: 'المنتجات الرقمية', icon: '💻' },
  { value: 'cars', label: 'السيارات', icon: '🚗' },
  { value: 'electronics', label: 'الإلكترونيات', icon: '📱' },
  { value: 'restaurants', label: 'المطاعم', icon: '🍽️' },
  { value: 'travel', label: 'السفر', icon: '✈️' },
  { value: 'health_beauty', label: 'الصحة والجمال', icon: '💄' },
  { value: 'education', label: 'التعليم', icon: '📚' },
  { value: 'technology', label: 'التقنية', icon: '💡' },
  { value: 'sports', label: 'الرياضة', icon: '⚽' },
  { value: 'hobbies', label: 'الهوايات', icon: '🎨' },
  { value: 'events', label: 'المناسبات', icon: '🎉' },
  { value: 'entertainment', label: 'الترفيه', icon: '🎬' },
  { value: 'hotels', label: 'الفنادق', icon: '🏨' },
  { value: 'music', label: 'الموسيقى', icon: '🎵' },
  { value: 'design', label: 'التصميم', icon: '🎯' },
  { value: 'games', label: 'الألعاب', icon: '🎮' },
  { value: 'home_tools', label: 'الأدوات المنزلية', icon: '🔧' },
  { value: 'decor', label: 'الديكور', icon: '🛋️' },
  { value: 'office_equipment', label: 'المعدات المكتبية', icon: '🖨️' },
  { value: 'digital_apps', label: 'التطبيقات الرقمية', icon: '📲' },
  { value: 'books', label: 'الكتب', icon: '📖' },
  { value: 'office_supplies', label: 'الأدوات المكتبية', icon: '✏️' },
  { value: 'finance', label: 'التمويل', icon: '💰' },
  { value: 'legal_services', label: 'الخدمات القانونية', icon: '⚖️' },
  { value: 'medical_services', label: 'الخدمات الطبية', icon: '🏥' },
  { value: 'social_services', label: 'الخدمات الاجتماعية', icon: '🤝' },
  { value: 'cafes', label: 'المقاهي', icon: '☕' },
  { value: 'beverages', label: 'المشروبات', icon: '🥤' },
  { value: 'fast_food', label: 'المأكولات السريعة', icon: '🍔' },
  { value: 'tourism', label: 'السياحة', icon: '🗺️' },
  { value: 'online_shopping', label: 'التسوق الإلكتروني', icon: '🛒' },
  { value: 'gifts', label: 'الهدايا', icon: '🎁' },
  { value: 'jewelry', label: 'المجوهرات', icon: '💎' },
  { value: 'accessories', label: 'الملحقات', icon: '👜' },
  { value: 'fashion', label: 'الموضة', icon: '👗' },
  { value: 'fitness', label: 'اللياقة البدنية', icon: '💪' },
  { value: 'mental_health', label: 'الصحة النفسية', icon: '🧘' },
  { value: 'workshops', label: 'الورش', icon: '🔨' },
  { value: 'training_courses', label: 'الدورات التدريبية', icon: '📝' },
  { value: 'government_services', label: 'الخدمات الحكومية', icon: '🏛️' },
  { value: 'festivals', label: 'المهرجانات', icon: '🎪' },
  { value: 'educational_events', label: 'الفعاليات التعليمية', icon: '🎓' },
  { value: 'digital_services', label: 'الخدمات الرقمية', icon: '🌐' },
  { value: 'seasonal_offers', label: 'العروض الموسمية', icon: '🏷️' },
  { value: 'jobs', label: 'الوظائف', icon: '💼' },
  { value: 'charity', label: 'الإعلانات الخيرية', icon: '❤️' },
  { value: 'community', label: 'الإعلانات المجتمعية', icon: '👥' },
] as const;

export type AdCategoryValue = typeof AD_CATEGORIES[number]['value'];

export const getCategoryLabel = (value: string) => {
  return AD_CATEGORIES.find(c => c.value === value)?.label || value;
};

export const getCategoryIcon = (value: string) => {
  return AD_CATEGORIES.find(c => c.value === value)?.icon || '📢';
};
