import React from 'react';
import { Activity } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

/**
 * Loading Spinner Component
 * 
 * Displays an animated loading indicator with optional text.
 * Usage: <LoadingSpinner size="md" text="جاري التحميل..." />
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text = 'جاري التحميل...',
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Activity className={`${sizeClasses[size]} text-teal-600 animate-pulse`} />
        <div className="absolute inset-0 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
      {text && (
        <p className="text-slate-600 text-sm font-medium animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
