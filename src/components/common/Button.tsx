import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText = 'Salvando...',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-primary text-on-primary hover:bg-primary-container focus:ring-primary/40 shadow-sm border border-transparent',
    secondary:
      'bg-secondary text-on-secondary hover:bg-secondary/90 focus:ring-secondary/40 shadow-sm border border-transparent',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400 shadow-sm border border-transparent',
    outline:
      'bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-high focus:ring-primary/30',
    destructive:
      'bg-error text-on-error hover:bg-red-700 focus:ring-error/40 shadow-sm border border-transparent',
    ghost:
      'bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface focus:ring-primary/20',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
