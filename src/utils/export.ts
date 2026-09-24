import * as XLSX from 'xlsx';
import { TreatmentSupport, Attendant } from '../types';
import { formatDateBR, formatDateTimeBR } from './calculations';

export function exportSupportsToExcel(
  supports: TreatmentSupport[],
  attendantsMap: Map<string, Attendant>,
  fileName: string = 'lancamentos_apoio_tratamento'
) {
  const data = supports.map((s) => {
    const attendant = attendantsMap.get(s.attendantId);
    return {
      'ID': s.id,
      'Data do Apoio': formatDateBR(s.date),
      'Código Atendente': attendant?.code || '-',
      'Nome Atendente': attendant?.name || 'Desconhecido',
      'Quantidade': s.quantity,
      'Observação': s.observation || '',
      'Criado Por': s.createdBy,
      'Criado Em': formatDateTimeBR(s.createdAt),
      'Atualizado Em': formatDateTimeBR(s.updatedAt),
      'Status': s.deletedAt ? `Excluído (${formatDateTimeBR(s.deletedAt)})` : 'Ativo',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportSupportsToCSV(
  supports: TreatmentSupport[],
  attendantsMap: Map<string, Attendant>,
  fileName: string = 'lancamentos_apoio_tratamento'
) {
  const data = supports.map((s) => {
    const attendant = attendantsMap.get(s.attendantId);
    return {
      'ID': s.id,
      'Data do Apoio': formatDateBR(s.date),
      'Código Atendente': attendant?.code || '-',
      'Nome Atendente': attendant?.name || 'Desconhecido',
      'Quantidade': s.quantity,
      'Observação': (s.observation || '').replace(/"/g, '""'),
      'Criado Por': s.createdBy,
      'Criado Em': formatDateTimeBR(s.createdAt),
      'Atualizado Em': formatDateTimeBR(s.updatedAt),
      'Status': s.deletedAt ? 'Excluído' : 'Ativo',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
