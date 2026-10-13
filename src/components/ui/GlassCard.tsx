import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'primary' | 'accent' | 'none';
}

const GlassCard = ({ children, className, hover = false, glow = 'none', ...props }: GlassCardProps) => {
  const glowClasses = {
    primary: 'hover:shadow-[0_0_40px_hsl(220_90%_60%_/_0.2)]',
    accent: 'hover:shadow-[0_0_40px_hsl(175_70%_45%_/_0.2)]',
    none: '',
  };

  return (
    <motion.div
      className={cn(
        'relative rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10',
        'shadow-[0_4px_16px_hsl(230_25%_5%_/_0.4),inset_0_1px_0_hsl(0_0%_100%_/_0.05)]',
        hover && 'transition-all duration-300 hover:bg-card/80 hover:border-white/20 hover:-translate-y-1',
        glowClasses[glow],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
