import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import GlassCard from './GlassCard';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning';
  delay?: number;
}

const StatCard = ({ title, value, icon: Icon, trend, variant = 'default', delay = 0 }: StatCardProps) => {
  const variantClasses = {
    default: 'from-card to-card',
    primary: 'from-primary/20 to-card',
    accent: 'from-accent/20 to-card',
    success: 'from-success/20 to-card',
    warning: 'from-warning/20 to-card',
  };

  const iconClasses = {
    default: 'bg-muted text-foreground',
    primary: 'bg-primary/20 text-primary',
    accent: 'bg-accent/20 text-accent',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <GlassCard hover glow={variant === 'primary' ? 'primary' : variant === 'accent' ? 'accent' : 'none'} className="p-6">
        <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-50', variantClasses[variant])} />
        <div className="relative flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-display font-bold">{value}</p>
            {trend && (
              <div className={cn(
                'flex items-center text-sm font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                <span className="mr-1">{trend.isPositive ? '↑' : '↓'}</span>
                {Math.abs(trend.value)}% from last month
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-xl', iconClasses[variant])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default StatCard;
