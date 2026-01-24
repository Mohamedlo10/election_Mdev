'use client';

import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', children, variant = 'info', ...props }, ref) => {
    const variants = {
      info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: <Info className="w-5 h-5 text-blue-500" />,
      },
      success: {
        bg: 'bg-theme-primary-lighter',
        border: 'border-theme-primary-medium',
        text: 'text-theme-primary-darker',
        icon: <CheckCircle className="w-5 h-5 text-theme-primary" />,
      },
      warning: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
      },
      error: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: <XCircle className="w-5 h-5 text-red-500" />,
      },
    };

    const style = variants[variant];

    return (
      <div
        ref={ref}
        className={`flex items-start gap-3 p-4 rounded-lg border ${style.bg} ${style.border} ${className}`}
        role="alert"
        {...props}
      >
        <div className="flex-shrink-0">{style.icon}</div>
        <div className={`text-sm ${style.text}`}>{children}</div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export default Alert;
