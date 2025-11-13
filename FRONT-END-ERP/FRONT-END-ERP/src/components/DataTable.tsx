import { ReactNode, useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import clsx from 'clsx';

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  emptyState?: ReactNode;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData, rowIndex: number) => string | undefined;
  getRowId?: (row: TData) => string;
  className?: string;
  caption?: string;
};

export const DataTable = <TData,>({
  data,
  columns,
  emptyState,
  onRowClick,
  rowClassName,
  getRowId,
  className,
  caption,
}: DataTableProps<TData>) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getRowId,
  });

  const hasRows = table.getRowModel().rows.length > 0;

  const tableClassName = useMemo(
    () =>
      clsx(
        'data-table',
        !hasRows && 'data-table--empty',
        onRowClick && 'data-table--interactive',
        className
      ),
    [hasRows, onRowClick, className]
  );

  return (
    <div className={clsx(tableClassName)}>
      <div className="data-table__surface">
        <table>
          {caption ? <caption className="data-table__caption">{caption}</caption> : null}
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortingState = header.column.getIsSorted();
                  const ariaSort =
                    sortingState === 'asc' ? 'ascending' : sortingState === 'desc' ? 'descending' : 'none';
                  
                  const colWidth = header.column.columnDef.size;
                  const style = colWidth ? { width: `${colWidth}px`, minWidth: `${colWidth}px` } : undefined;
                  
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={clsx('data-table__header', {
                        'data-table__header--sortable': isSortable,
                        'data-table__header--sorted': Boolean(sortingState),
                      })}
                      aria-sort={ariaSort}
                      style={style}
                      onClick={
                        isSortable
                          ? () => {
                              header.column.toggleSorting(sortingState === 'asc');
                            }
                          : undefined
                      }
                    >
                      <div className="data-table__header-content">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {isSortable ? (
                          <span className="data-table__sort-indicator" aria-hidden>
                            {sortingState === 'asc' ? '▲' : sortingState === 'desc' ? '▼' : '◇'}
                          </span>
                        ) : null}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {hasRows ? (
              table.getRowModel().rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={clsx('data-table__row', rowClassName?.(row.original, rowIndex))}
                  onClick={() => {
                    if (onRowClick) {
                      onRowClick(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="data-table__cell">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className="data-table__empty">
                  {emptyState ?? 'Aucune donnée à afficher pour le moment.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export type { ColumnDef } from '@tanstack/react-table';

