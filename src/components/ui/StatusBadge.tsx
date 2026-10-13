import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'available' | 'occupied' | 'maintenance' | 'pending' | 'paid' | 'overdue' | 'in-progress' | 'fixed' | 'closed' | 'active' | 'ended';
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const statusConfig = {
    available: { bg: 'bg-success/20', text: 'text-success', label: 'Available' },
    occupied: { bg: 'bg-primary/20', text: 'text-primary', label: 'Occupied' },
    maintenance: { bg: 'bg-warning/20', text: 'text-warning', label: 'Maintenance' },
    pending: { bg: 'bg-warning/20', text: 'text-warning', label: 'Pending' },
    paid: { bg: 'bg-success/20', text: 'text-success', label: 'Paid' },
    overdue: { bg: 'bg-destructive/20', text: 'text-destructive', label: 'Overdue' },
    'in-progress': { bg: 'bg-primary/20', text: 'text-primary', label: 'In Progress' },
    fixed: { bg: 'bg-success/20', text: 'text-success', label: 'Fixed' },
    closed: { bg: 'bg-muted/50', text: 'text-muted-foreground', label: 'Closed' },
    active: { bg: 'bg-success/20', text: 'text-success', label: 'Active' },
    ended: { bg: 'bg-muted/50', text: 'text-muted-foreground', label: 'Ended' },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full mr-2', config.text.replace('text-', 'bg-'))} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
