import React, { Fragment, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, title, description, children,
  size = 'md', showCloseButton = true, closeOnOverlayClick = true,
}) => {
  if (!isOpen) return null;
  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', full: 'max-w-4xl' };
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) onClose();
  };
  return (
    <Fragment>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" aria-hidden="true" onClick={handleOverlayClick} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className={cn('relative bg-background rounded-lg shadow-xl animate-in zoom-in-95 duration-200', sizeClasses[size])}>
          <div className="flex items-start justify-between p-6 border-b">
            <div>
              {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            {showCloseButton && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </Fragment>
  );
};
export { Modal };
