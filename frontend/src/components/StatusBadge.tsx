import type { DeviceStatus } from '../types';

const styles: Record<DeviceStatus, string> = {
  ONLINE: 'bg-green-100 text-green-800',
  OFFLINE: 'bg-red-100 text-red-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
};

const dots: Record<DeviceStatus, string> = {
  ONLINE: 'bg-green-500',
  OFFLINE: 'bg-red-500',
  WARNING: 'bg-yellow-500',
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
