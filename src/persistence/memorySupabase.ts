type Row = Record<string, unknown>;

function copyRows(rows: Row[]) {
  return rows.map((r) => ({ ...r }));
}

export class MemorySupabase {
  tables = new Map<string, Row[]>();
  blobs = new Map<string, ArrayBuffer>();

  private rows(table: string) {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  from(table: string) {
    const self = this;
    return {
      select(_cols: string) {
        return {
          eq(col: string, val: string) {
            const matched = copyRows(self.rows(table).filter((r) => r[col] === val));
            const promise = Promise.resolve({ data: matched, error: null });
            return Object.assign(promise, {
              maybeSingle: async () => ({ data: matched[0] ?? null, error: null }),
            });
          },
          async in(col: string, vals: string[]) {
            return {
              data: copyRows(self.rows(table).filter((r) => vals.includes(String(r[col])))),
              error: null,
            };
          },
        };
      },
      async upsert(input: Row | Row[]) {
        const incoming = Array.isArray(input) ? input : [input];
        const tableRows = self.rows(table);
        for (const row of incoming) {
          const idx = tableRows.findIndex((r) => r.id === row.id);
          if (idx >= 0) tableRows[idx] = { ...tableRows[idx], ...row };
          else tableRows.push({ ...row });
        }
        return { data: incoming, error: null };
      },
      delete() {
        return {
          async eq(col: string, val: string) {
            self.tables.set(
              table,
              self.rows(table).filter((r) => r[col] !== val),
            );
            return { data: null, error: null };
          },
          async in(col: string, vals: string[]) {
            self.tables.set(
              table,
              self.rows(table).filter((r) => !vals.includes(String(r[col]))),
            );
            return { data: null, error: null };
          },
        };
      },
    };
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, bytes: ArrayBuffer) => {
        this.blobs.set(`${bucket}:${path}`, bytes.slice(0));
        return { error: null };
      },
      download: async (path: string) => {
        const buf = this.blobs.get(`${bucket}:${path}`);
        if (!buf) return { data: null };
        return { data: new Blob([buf]) };
      },
      remove: async (paths: string[]) => {
        for (const path of paths) this.blobs.delete(`${bucket}:${path}`);
        return { error: null };
      },
    }),
  };
}
