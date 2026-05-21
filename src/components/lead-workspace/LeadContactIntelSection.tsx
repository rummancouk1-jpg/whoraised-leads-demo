import type { LeadDrawerProfile } from "@/types/lead-drawer";
import { DrawerSection } from "@/components/lead-workspace/DrawerSection";

export function LeadContactIntelSection({
  profile,
  onCopy,
  copiedId,
}: {
  profile: LeadDrawerProfile;
  onCopy?: (text: string, id: string) => void;
  copiedId?: string | null;
}) {
  const { lead, contact } = profile;
  const emailId = `${lead.id}-drawer-email`;

  return (
    <DrawerSection id="drawer-contact" title="Contact & intelligence" className="mb-0">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <IntelRow label="Email" value={lead.email} />
        <IntelRow label="Email confidence" value={contact.emailConfidence} />
        <IntelRow label="Phone" value={lead.phone} />
        <IntelRow label="LinkedIn" value={contact.linkedInStatus} />
        <IntelRow label="Website" value={contact.website} isLink />
        <IntelRow label="Employee growth" value={contact.employeeGrowth} />
        <IntelRow label="Funding recency" value={contact.fundingRecency} />
        <IntelRow label="Location" value={lead.location} />
      </dl>

      {onCopy ? (
        <button
          type="button"
          onClick={() => onCopy(lead.email, emailId)}
          className={`mt-3 w-full rounded-md border px-3 py-2 text-[11px] font-semibold transition-colors ${
            copiedId === emailId
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {copiedId === emailId ? "Email copied" : "Copy founder email"}
        </button>
      ) : null}
    </DrawerSection>
  );
}

function IntelRow({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/50 px-2.5 py-2">
      <dt className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[11px] font-medium text-slate-800">
        {isLink ? (
          <span className="text-indigo-600">{value}</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
