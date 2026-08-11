import type { ReactNode } from "react";

import { EmptyState } from "./EmptyState";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";

export interface Column<T> {
  key: string;
  header: string;
  /** Renders the cell. Monospace is opt-in per column, for codes and IDs. */
  render: (row: T) => ReactNode;
  mono?: boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  emptyMessage: string;
  /** Prefix for the row testids: `${testIdPrefix}-row-${rowKey(row)}`. */
  testIdPrefix: string;
}

export function DataTable<T>({ rows, columns, rowKey, emptyMessage, testIdPrefix }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} data-testid={`${testIdPrefix}-empty`} />;
  }

  return (
    <Table data-testid={`${testIdPrefix}-table`}>
      <THead>
        <TR>
          {columns.map((c) => (
            <TH key={c.key}>{c.header}</TH>
          ))}
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={rowKey(row)} data-testid={`${testIdPrefix}-row-${rowKey(row)}`}>
            {columns.map((c) => (
              <TD key={c.key} mono={c.mono ?? false}>
                {c.render(row)}
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
