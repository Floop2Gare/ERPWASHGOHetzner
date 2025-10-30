import { ReactNode } from 'react';
import clsx from 'clsx';

interface TableProps {
  columns: ReactNode[];
  rows: ReactNode[][];
  footer?: ReactNode;
  tone?: 'elevated' | 'plain';
  density?: 'regular' | 'compact';
  striped?: boolean;
  onRowClick?: (rowIndex: number) => void;
  rowClassName?: (rowIndex: number) => string | undefined;
  bordered?: boolean;
  dividers?: boolean;
  className?: string;
}

export const Table = ({
  columns,
  rows,
  footer,
  tone = 'elevated',
  density = 'regular',
  striped = true,
  onRowClick,
  rowClassName,
  bordered = true,
  dividers = true,
  className,
}: TableProps) => {
  const containerToneClass = tone === 'plain' ? 'washingo-table-container--plain' : 'washingo-table-container--elevated';
  const containerBorderClass = bordered
    ? 'washingo-table-container--bordered'
    : 'washingo-table-container--borderless';

  const headerCellClasses = clsx(
    'table-header-cell sticky top-0 text-[10px] font-semibold uppercase tracking-[0.24em]',
    density === 'compact' ? 'px-4 py-2' : 'px-4 py-2.5'
  );

  const bodyCellClasses =
    density === 'compact'
      ? 'table-body-cell px-4 py-2.5 align-top text-[11px] leading-snug'
      : 'table-body-cell px-4 py-3 align-top text-[12px] leading-snug';

  const fontSize = density === 'compact' ? 'text-[12px]' : 'text-[13px]';

  const tableClasses = clsx('washingo-table w-full min-w-[720px] text-left', {
    'washingo-table--no-dividers': !dividers,
  });

  return (
    <div className={clsx('w-full overflow-x-auto', className)}>
      <div
        className={clsx(
          'washingo-table-container inline-block min-w-full overflow-hidden rounded-2xl align-top md:min-w-max',
          containerToneClass,
          containerBorderClass
        )}
      >
        <div className={clsx('w-full md:max-h-[460px] md:overflow-y-auto', fontSize)}>
          <table className={tableClasses}>
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={index} scope="col" className={headerCellClasses}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((cells, index) => {
                const isInteractive = Boolean(onRowClick);
                const baseRowTone = striped ? (index % 2 === 0 ? 'washingo-table-row--even' : 'washingo-table-row--odd') : 'washingo-table-row--even';
                const interactiveClasses = isInteractive
                  ? 'washingo-table-row--interactive cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30'
                  : undefined;
                const extraClasses = rowClassName?.(index);

                return (
                  <tr
                    key={index}
                    tabIndex={isInteractive ? 0 : undefined}
                    className={clsx('washingo-table-row transition-colors', baseRowTone, interactiveClasses, extraClasses)}
                    onClick={() => onRowClick?.(index)}
                    onKeyDown={(event) => {
                      if (!isInteractive) {
                        return;
                      }
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick?.(index);
                    }
                  }}
                >
                  {cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className={bodyCellClasses}>
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {footer && (
          <div className={clsx('table-footer px-3.5 py-3 text-sm', tone === 'plain' ? 'md:px-3 md:py-2.5' : null)}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
