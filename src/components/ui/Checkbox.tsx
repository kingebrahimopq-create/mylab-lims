import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, label, error, ...props }, ref) => (
  <div className="flex items-start space-x-2">
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border border-input bg-background text-primary ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        { 'border-destructive focus:ring-destructive': !!error },
        className
      )}
      {...props}
    />
    {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">{label}</label>}
  </div>
));
Checkbox.displayName = 'Checkbox';
export { Checkbox };
