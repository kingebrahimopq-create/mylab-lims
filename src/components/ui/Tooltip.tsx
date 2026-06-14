import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
}) => {
  return (
    <div className="group relative inline-block">
      {children}
      <div
        className={cn(
          'absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          'bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap',
          {
            '-top-2 left-1/2 -translate-x-1/2': position === 'top',
            '-bottom-2 left-1/2 -translate-x-1/2': position === 'bottom',
            '-left-2 top-1/2 -translate-y-1/2': position === 'left',
            '-right-2 top-1/2 -translate-y-1/2': position === 'right',
          }
        )}
        style={{ transitionDelay: `${delay}ms` }}
      >
        {content}
        <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45" />
      </div>
    </div>
  );
};
