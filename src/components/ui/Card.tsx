import React, { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string; description?: string; footer?: ReactNode;
  headerClassName?: string; contentClassName?: string; footerClassName?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, description, footer, headerClassName, contentClassName, footerClassName, children, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props}>
      {(title || description) && (
        <div className={cn('flex flex-col space-y-1.5 p-6', headerClassName)}>
          {title && <h3 className="text-2xl font-semibold leading-none tracking-tight">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className={cn('p-6', contentClassName)}>{children}</div>
      {footer && <div className={cn('flex items-center p-6', footerClassName)}>{footer}</div>}
    </div>
  )
);
Card.displayName = 'Card';
export { Card };
