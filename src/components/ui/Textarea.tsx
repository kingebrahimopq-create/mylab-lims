import React, { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string; label?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, label, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium mb-1.5 text-foreground">{label}{props.required && <span className="text-destructive mx-1">*</span>}</label>}
    <textarea ref={ref} className={cn('flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      { 'border-destructive focus-visible:ring-destructive': !!error }, className)} {...props} />
    {error && <p className="text-sm font-medium text-destructive mt-1">{error}</p>}
  </div>
));
Textarea.displayName = 'Textarea';
export { Textarea };
