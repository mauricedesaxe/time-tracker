import { useState, useEffect } from "react";
import { Store, Row } from "tinybase";

// Get sorted rows from a table
export function useRows(
  store: Store,
  tableId: string,
  cellId?: string,
  options?: {
    sortKey?: string;
    sortDirection?: "asc" | "desc";
  }
) {
  const [rows, setRows] = useState<
    (Record<string, unknown> & { id: string })[]
  >([]);

  useEffect(() => {
    // Initial load
    const loadRows = () => {
      const reverse = options?.sortDirection === "desc";
      const sortKey = options?.sortKey || cellId;

      const rowIds = sortKey
        ? store.getSortedRowIds(tableId, sortKey, reverse)
        : store.getRowIds(tableId);

      const rowsData = rowIds.map((id) => ({
        ...store.getRow(tableId, id),
        id,
      }));

      setRows(rowsData as (Record<string, unknown> & { id: string })[]);
    };

    // Load initial data
    loadRows();

    // Set up listener for changes
    const listenerId = store.addTableListener(tableId, () => {
      loadRows();
    });

    return () => {
      store.delListener(listenerId);
    };
  }, [store, tableId, cellId, options?.sortKey, options?.sortDirection]);

  return rows;
}

// Create a row in a table
export function useCreateRow(store: Store, tableId: string) {
  return (rowId: string, rowData: Row) => {
    return store.setRow(tableId, rowId, rowData);
  };
}
