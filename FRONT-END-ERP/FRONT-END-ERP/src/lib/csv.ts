export type CsvValue = string | number | boolean | null | undefined;

const normaliseValue = (value: CsvValue): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return '';
    }
    return String(value);
  }
  return value;
};

export const buildCsvLine = (values: CsvValue[], separator = ';') =>
  values
    .map((rawValue) => {
      const normalised = normaliseValue(rawValue).replace(/\r?\n/g, ' ').trim();
      if (!normalised) {
        return '';
      }
      const escaped = normalised.replace(/"/g, '""');
      if (escaped.includes(separator) || /["\r\n]/.test(normalised)) {
        return `"${escaped}"`;
      }
      return escaped;
    })
    .join(separator);

type DownloadCsvOptions = {
  fileName: string;
  header: string[];
  rows: CsvValue[][];
  separator?: string;
  includeBom?: boolean;
};

export const downloadCsv = ({
  fileName,
  header,
  rows,
  separator = ';',
  includeBom = true,
}: DownloadCsvOptions) => {
  if (!rows.length) {
    return;
  }
  const lines = [buildCsvLine(header, separator), ...rows.map((row) => buildCsvLine(row, separator))];
  const content = lines.join('\n');
  const prefix = includeBom ? '\ufeff' : '';
  const blob = new Blob([`${prefix}${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
