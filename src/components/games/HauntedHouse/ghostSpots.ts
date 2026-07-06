// Natural ghost spawn spots inside the haunted mansion background.
// Values are % of container (x from left, y from top).
export interface GhostSpot { x: number; y: number; label: string; }

export const GHOST_SPOTS: GhostSpot[] = [
  { x: 30, y: 15, label: "نافذة علوية" },
  { x: 62, y: 20, label: "لوحة قديمة" },
  { x: 78, y: 22, label: "لوحة يمين" },
  { x: 48, y: 35, label: "أعلى السلالم" },
  { x: 20, y: 45, label: "خزانة يسار" },
  { x: 55, y: 50, label: "منتصف السلالم" },
  { x: 82, y: 48, label: "ساعة الحائط" },
  { x: 45, y: 60, label: "باب مفتوح" },
  { x: 30, y: 70, label: "أسفل السلالم" },
  { x: 15, y: 82, label: "الأريكة" },
  { x: 68, y: 78, label: "خلف الباب" },
  { x: 88, y: 82, label: "طاولة يمين" },
  { x: 50, y: 88, label: "السجادة" },
  { x: 25, y: 30, label: "زجاج ملون" },
];