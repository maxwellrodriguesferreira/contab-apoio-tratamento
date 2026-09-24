import React from 'react';
import { Button } from './Button';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Carregando dados com segurança...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-on-surface-variant">{message}</p>
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({
  title,
  description,
  icon = 'inbox',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/60 my-4">
      <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-outline mb-3">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>
      <h4 className="text-base font-bold text-on-surface mb-1">{title}</h4>
      <p className="text-sm text-on-surface-variant max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} icon="add">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({
  title = 'Ocorreu um problema',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50 border border-rose-200 rounded-xl my-4">
      <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-error mb-3">
        <span className="material-symbols-outlined text-[28px]">error</span>
      </div>
      <h4 className="text-base font-bold text-rose-900 mb-1">{title}</h4>
      <p className="text-sm text-rose-700 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon="refresh">
          Tentar Novamente
        </Button>
      )}
    </div>
  );
};
