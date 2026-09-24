import React from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  icon?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, icon, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
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
          <select
            id={selectId}
            ref={ref}
            className={`w-full h-10 px-3 ${
              icon ? 'pl-9' : ''
            } pr-8 rounded-lg bg-surface-container-lowest border appearance-none ${
              error ? 'border-error focus:ring-error/20' : 'border-outline-variant focus:border-primary focus:ring-primary/20'
            } text-sm text-on-surface focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:bg-surface-container-low cursor-pointer ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2.5 text-outline text-[20px] pointer-events-none">
            expand_more
          </span>
        </div>
        {error && <span className="text-xs font-medium text-error flex items-center gap-1">{error}</span>}
        {helperText && !error && <span className="text-xs text-on-surface-variant">{helperText}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
