import type { ReactNode } from "react";
function Svg({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return <svg className="gg-icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
}
export const SearchIcon = () => <Svg><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></Svg>;
export const HomeIcon = () => <Svg><path d="M4 11l8-6.5 8 6.5" /><path d="M6 10v9h12v-9" /></Svg>;
export const BoardIcon = () => <Svg><rect x="3.5" y="4" width="5" height="16" rx="1.5" /><rect x="10.5" y="4" width="5" height="10" rx="1.5" /><rect x="17.5" y="4" width="3" height="13" rx="1.5" /></Svg>;
export const MailIcon = () => <Svg><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="M4.5 7.5l7.5 6 7.5-6" /></Svg>;
export const SunIcon = () => <Svg><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></Svg>;
export const MoonIcon = () => <Svg><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></Svg>;
export const SystemIcon = () => <Svg><rect x="3.5" y="5" width="17" height="11.5" rx="2" /><path d="M9 20h6M12 16.5V20" /></Svg>;
export const ChevronIcon = () => <Svg size={16}><path d="M6 9l6 6 6-6" /></Svg>;
export const FilterIcon = () => <Svg size={18}><path d="M4 6h16M7 12h10M10 18h4" /></Svg>;
export const CloseIcon = () => <Svg size={18}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const ArrowIcon = () => <Svg size={16}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const LogoutIcon = () => <Svg size={18}><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 16l-4-4 4-4M6 12h10" /></Svg>;
export const CornerIcon = () => <Svg size={16}><path d="M9 10l-4 4 4 4M5 14h10a4 4 0 004-4V6" /></Svg>;
export const GripIcon = () => <svg className="gg-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="5.5" cy="3.5" r="1.2" /><circle cx="10.5" cy="3.5" r="1.2" /><circle cx="5.5" cy="8" r="1.2" /><circle cx="10.5" cy="8" r="1.2" /><circle cx="5.5" cy="12.5" r="1.2" /><circle cx="10.5" cy="12.5" r="1.2" /></svg>;
