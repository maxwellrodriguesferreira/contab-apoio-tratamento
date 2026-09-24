import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-surface-container-lowest border-t border-outline-variant/30 text-xs text-on-surface-variant">
      <div className="flex items-center gap-3">
        <span>
          Mostrando <strong className="text-on-surface font-semibold">{startItem}</strong> a{' '}
          <strong className="text-on-surface font-semibold">{endItem}</strong> de{' '}
          <strong className="text-on-surface font-semibold">{totalItems}</strong> registros
        </span>
        <div className="flex items-center gap-1.5 ml-2">
          <span>Itens por página:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 px-2 bg-surface-container-low rounded border border-outline-variant/50 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none text-on-surface transition-colors"
          title="Primeira Página"
        >
          <span className="material-symbols-outlined text-[18px]">first_page</span>
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none text-on-surface transition-colors"
          title="Página Anterior"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        <span className="px-3 py-1 bg-surface-container-low rounded font-semibold text-on-surface">
          {currentPage} de {Math.max(1, totalPages)}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="p-1 rounded hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none text-on-surface transition-colors"
          title="Próxima Página"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="p-1 rounded hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none text-on-surface transition-colors"
          title="Última Página"
        >
          <span className="material-symbols-outlined text-[18px]">last_page</span>
        </button>
      </div>
    </div>
  );
};
