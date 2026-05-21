import { getAvatarTint, getCompanyInitials } from "@/lib/pipeline-ui";

interface CompanyAvatarProps {
  companyName: string;
  size?: "sm" | "md";
}

const SIZE = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-[11px]",
} as const;

export function CompanyAvatar({ companyName, size = "sm" }: CompanyAvatarProps) {
  const initials = getCompanyInitials(companyName);
  const tint = getAvatarTint(companyName);

  return (
    <div
      className={`${SIZE[size]} shrink-0 rounded-md bg-gradient-to-br ${tint} flex items-center justify-center font-semibold tracking-tight text-white shadow-sm shadow-black/20 ring-1 ring-white/15`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
