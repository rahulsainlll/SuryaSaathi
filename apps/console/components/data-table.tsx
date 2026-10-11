"use client";

import { Card, Table } from "@heroui/react";
import { useMemo, useState, type ReactNode } from "react";
import type { SortDescriptor } from "react-aria-components";

export interface Column<T> {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
  /** Value to sort by; the column is sortable when given. */
  sortValue?: (row: T) => number | string | null;
  align?: "start" | "end";
  rowHeader?: boolean;
}

/**
 * A HeroUI table that scrolls inside its own box (never the page), optionally sortable.
 * Rows keep the order they were given until a sortable header is pressed.
 */
export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  empty = "Nothing to show.",
  initialSort,
}: {
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  initialSort?: SortDescriptor;
}) {
  const [sort, setSort] = useState<SortDescriptor | undefined>(initialSort);
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.id === sort?.column);
    if (!sort || !col?.sortValue) return rows;
    const dir = sort.direction === "descending" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const x = col.sortValue!(a);
      const y = col.sortValue!(b);
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x < y ? -1 : 1) * dir;
    });
  }, [rows, columns, sort]);

  if (rows.length === 0) {
    return (
      <Card>
        <Card.Content className="text-sm text-muted">{empty}</Card.Content>
      </Card>
    );
  }

  return (
    <Table className="rounded-2xl">
      <Table.ScrollContainer className="max-h-[70vh] overflow-auto">
        <Table.Content
          aria-label={label}
          sortDescriptor={sort}
          onSortChange={setSort}
          className="min-w-max"
        >
          <Table.Header>
            {columns.map((c) => (
              <Table.Column
                key={c.id}
                id={c.id}
                isRowHeader={c.rowHeader}
                allowsSorting={Boolean(c.sortValue)}
                className={c.align === "end" ? "text-end" : undefined}
              >
                {({ sortDirection }) =>
                  c.sortValue ? (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      {c.label}
                    </Table.SortableColumnHeader>
                  ) : (
                    c.label
                  )
                }
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body>
            {sorted.map((row) => (
              <Table.Row key={rowKey(row)} id={rowKey(row)}>
                {columns.map((c) => (
                  <Table.Cell
                    key={c.id}
                    className={c.align === "end" ? "text-end tabular-nums" : undefined}
                  >
                    {c.render(row)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
