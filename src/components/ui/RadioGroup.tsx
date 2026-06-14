import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: { value: string; label: string; disabled?: boolean }[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  direction?: 'horizontal' | 'vertical';
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  className,
  options,
  value,
  onChange,
  disabled = false,
  error,
  label,
  direction = 'vertical',
  ...props
}) => (
  <div className={cn('w-full', className)} {...props}>
    {label && <label className="block text-sm font-medium mb-1.5 text-foreground">{label}</label>}
    <div className={cn('flex gap-4', direction === 'horizontal' ? 'flex-row' : 'flex-col')}>
      {options.map((option) => (
        <div key={option.value} className="flex items-center space-x-2">
          <input
            type="radio"
            id={option.value}
            value={option.value}
            checked={value === option.value}
            onChange={() => !disabled && onChange?.(option.value)}
            disabled={disabled || option.disabled}
            className="h-4 w-4 border border-input bg-background text-primary ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <label
            htmlFor={option.value}
            className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              { 'cursor-not-allowed opacity-50': disabled || option.disabled }
            )}
          >
            {option.label}
          </label>
        </div>
      ))}
    </div>
    {error && <p className="text-sm font-medium text-destructive mt-1">{error}</p>}
  </div>
);
export { RadioGroup };
