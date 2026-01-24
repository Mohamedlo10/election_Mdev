'use client';

import { ButtonHTMLAttributes, forwardRef, CSSProperties } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, disabled, children, style, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    // Styles inline pour les variantes (pour Tailwind CSS 4 compatibilité)
    const variantStyles: Record<string, CSSProperties> = {
      primary: {
        backgroundColor: 'var(--theme-primary)',
        color: 'white',
      },
      secondary: {
        backgroundColor: 'var(--theme-secondary)',
        color: 'white',
      },
      outline: {
        backgroundColor: 'transparent',
        color: 'var(--theme-primary)',
        border: '2px solid var(--theme-primary)',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--theme-primary)',
      },
      danger: {
        backgroundColor: '#ef4444',
        color: 'white',
      },
    };

    const variantClasses = {
      primary: '',
      secondary: '',
      outline: '',
      ghost: '',
      danger: 'hover:bg-red-600 focus:ring-red-500',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizes[size]} ${variantClasses[variant]} ${className} btn-${variant}`}
        disabled={disabled || loading}
        style={{ ...variantStyles[variant], ...style }}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
