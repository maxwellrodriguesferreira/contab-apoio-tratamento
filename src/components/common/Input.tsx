import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="material-symbols-outlined absolute left-3 text-outline text-[18px] pointer-events-none">
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-10 px-3 ${
              icon ? 'pl-9' : ''
            } rounded-lg bg-surface-container-lowest border ${
              error ? 'border-error focus:ring-error/20' : 'border-outline-variant focus:border-primary focus:ring-primary/20'
            } text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:bg-surface-container-low ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-xs font-medium text-error flex items-center gap-1">{error}</span>}
        {helperText && !error && <span className="text-xs text-on-surface-variant">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
