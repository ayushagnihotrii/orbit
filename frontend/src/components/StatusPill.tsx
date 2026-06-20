import type { ModerationStatus } from '@/lib/types';

const STYLES: Record<ModerationStatus, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  REMOVED: 'bg-red-50 text-red-700 border-red-200',
};

const LABELS: Record<ModerationStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending review',
  REMOVED: 'Removed',
};

export function StatusPill({ status }: { status: ModerationStatus }) {
  if (status === 'APPROVED') return null;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
