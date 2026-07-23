import { Status } from '../types';
import { cn } from '../lib/utils';

export function StatusBadge({ status }: { status: Status }) {
  const colors = {
    'To-Do': 'bg-gray-100 text-gray-700 border-gray-200',
    'On Progress': 'bg-orange-100 text-orange-700 border-orange-200',
    'Revisi': 'bg-red-100 text-red-700 border-red-200',
    'Done': 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <span className={cn('px-2.5 py-1 text-xs font-medium border rounded-full whitespace-nowrap', colors[status] || colors['To-Do'])}>
      {status}
    </span>
  );
}
