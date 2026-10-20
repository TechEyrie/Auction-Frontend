import type { LucideIcon } from 'lucide-react';
import {
  Car,
  CircleDotDashed,
  Coffee,
  Disc2,
  Folder,
  Gem,
  Glasses,
  House,
  PersonStanding,
  Pill,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  SprayCan,
  Tag,
  Wallet,
  Watch,
} from 'lucide-react';

const STROKE = '#9A6B12';
const STROKE_WIDTH = 1.75;

/** Keys mirror backend `CATEGORY_ICON_KEYS`. */
const ICON_COMPONENTS: Record<string, LucideIcon> = {
  glasses: Glasses,
  'tea-coffee': Coffee,
  abaya: PersonStanding,
  'natural-leather': Wallet,
  perfume: SprayCan,
  supplements: Pill,
  misbah: CircleDotDashed,
  watches: Watch,
  'clothes-thobes': Shirt,
  cufflinks: Disc2,
  tag: Tag,
  shirt: Shirt,
  bag: ShoppingBag,
  watch: Watch,
  sparkle: Sparkles,
  home: House,
  car: Car,
  phone: Smartphone,
  gem: Gem,
  folder: Folder,
};

type CategoryIconProps = {
  icon: string | null;
  size?: number;
  className?: string;
};

export function CategoryIcon({ icon, size = 24, className }: CategoryIconProps) {
  const key = icon && ICON_COMPONENTS[icon] ? icon : 'tag';
  const Icon = ICON_COMPONENTS[key] ?? Tag;
  return (
    <Icon
      size={size}
      color={STROKE}
      strokeWidth={STROKE_WIDTH}
      aria-hidden="true"
      className={className}
    />
  );
}
