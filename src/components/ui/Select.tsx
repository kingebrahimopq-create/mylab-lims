import React, { useState, forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: { value: string; label: string; disabled?: boolean }[];
  value?: string; onChange?: (value: string) => void;
  placeholder?: string; disabled?: boolean; error?: string; label?: string; required?: boolean;
}

const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ className, options, value, onChange, placeholder = 'Select an option', disabled = false, error, label, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find((opt) => opt.value === value);
    const handleSelect = (optionValue: string) => { onChange?.(optionValue); setIsOpen(false); };
    return (
      <div className="w-full" ref={ref}>
        {label && <label className="block text-sm font-medium mb-1.5 text-foreground">{label}{props.required && <span className="text-destructive mx-1">*</span>}</label>}
        <div className="relative">
          <button type="button" onClick={() => !disabled && setIsOpen(!isOpen)} disabled={disabled}
            className={cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              { 'border-destructive focus:ring-destructive': !!error }, className)}>
            <span>{selectedOption ? selectedOption.label : placeholder}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 rounded-md border bg-background shadow-lg animate-in fade-in-80">
              {options.map((option) => (
                <button key={option.value} type="button" onClick={() => handleSelect(option.value)} disabled={option.disabled}
                  className={cn('w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left',
                    { 'bg-accent text-accent-foreground': value === option.value, 'cursor-not-allowed opacity-50': option.disabled })}>
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-sm font-medium text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
export { Select };
