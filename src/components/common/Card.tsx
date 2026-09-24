import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  icon?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  footer,
  icon,
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-subtle p-5 flex flex-col justify-between ${className}`}
      {...props}
    >
      {(title || action || icon) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
              </div>
            )}
            <div className="flex flex-col">
              {title && <h3 className="font-bold text-base text-on-surface leading-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-on-surface-variant mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="flex-1">{children}</div>
      {footer && <div className="mt-4 pt-3 border-t border-outline-variant/30">{footer}</div>}
    </div>
  );
};
