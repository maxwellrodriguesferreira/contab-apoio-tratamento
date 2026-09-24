import React from 'react';

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  children: React.ReactNode;
  icon?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  size = 'sm',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1 font-bold',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-semibold',
  };

  const variantStyles = {
    primary: 'bg-primary-fixed text-primary border border-primary/20',
    secondary: 'bg-secondary-fixed text-on-secondary-fixed border border-secondary/20',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    warning: 'bg-amber-100 text-amber-800 border border-amber-300',
    error: 'bg-rose-100 text-rose-800 border border-rose-300',
    neutral: 'bg-surface-container-high text-on-surface-variant border border-outline-variant/40',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-wide uppercase ${sizeStyles[size]} ${variantStyles[variant]}`}
    >
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      {children}
    </span>
  );
};
