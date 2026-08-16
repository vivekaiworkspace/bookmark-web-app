export const COLLECTION_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#10B981",
  "#14B8A6",
  "#EF4444",
  "#6366F1",
];

export const TAG_COLORS = [
  "#6B7280",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#EF4444",
];

const SWATCH_BG: Record<string, string> = {
  "#3B82F6": "bg-blue-500",
  "#8B5CF6": "bg-violet-500",
  "#EC4899": "bg-pink-500",
  "#F97316": "bg-orange-500",
  "#10B981": "bg-emerald-500",
  "#14B8A6": "bg-teal-500",
  "#EF4444": "bg-red-500",
  "#6366F1": "bg-indigo-500",
  "#6B7280": "bg-gray-500",
  "#F59E0B": "bg-amber-500",
};

const SWATCH_RING: Record<string, string> = {
  "#3B82F6": "border-blue-500 text-blue-600",
  "#8B5CF6": "border-violet-500 text-violet-600",
  "#EC4899": "border-pink-500 text-pink-600",
  "#F97316": "border-orange-500 text-orange-600",
  "#10B981": "border-emerald-500 text-emerald-600",
  "#14B8A6": "border-teal-500 text-teal-600",
  "#EF4444": "border-red-500 text-red-600",
  "#6366F1": "border-indigo-500 text-indigo-600",
  "#6B7280": "border-gray-500 text-gray-600",
  "#F59E0B": "border-amber-500 text-amber-600",
};

export function swatchBgClass(hex: string) {
  return SWATCH_BG[hex] ?? "bg-muted";
}

export function swatchRingClass(hex: string) {
  return SWATCH_RING[hex] ?? "border-border text-muted-foreground";
}
