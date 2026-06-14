import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning' | 'info';
  size?: 'default' | 'sm' | 'lg';
  dot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', size = 'default', dot = false, children, ...props }) => {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground', destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input text-foreground', secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };
  const sizeClasses = { default: 'px-2.5 py-0.5 text-xs', sm: 'px-2 py-0.5 text-xs', lg: 'px-3 py-1 text-sm' };
  return (
    <div className={cn('inline-flex items-center font-medium rounded-full', variantClasses[variant], sizeClasses[size], className)} {...props}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', {
        'bg-white': variant === 'default' || variant === 'secondary' || variant === 'outline',
        'bg-black': variant === 'destructive',
      })} />}
      {children}
    </div>
  );
};
export { Badge };
