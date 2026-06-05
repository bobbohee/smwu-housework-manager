export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/chores", label: "집안일", icon: "🧹" },
  { href: "/calendar", label: "캘린더", icon: "📅" },
  { href: "/random", label: "꽝뽑기", icon: "🎲" },
  { href: "/stats", label: "통계", icon: "📊" },
  { href: "/settings", label: "설정", icon: "⚙️" },
];
