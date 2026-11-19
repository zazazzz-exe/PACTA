// In-memory stand-in for the small slice of the Supabase query builder the API
// uses (insert, delete().lt(), select(count, head).gte().eq()). Test-only:
// imported from *.test.ts files, never from an endpoint.

type Row = Record<string, unknown>;

export interface FakeDb {
  tables: Record<string, Row[]>;
  from(table: string): any;
}

export function fakeSupabase(
  opts: { failInsertOn?: string[]; unique?: Record<string, string> } = {},
): FakeDb {
  const tables: Record<string, Row[]> = {};
  const rows = (t: string) => (tables[t] ??= []);

  function query(table: string) {
    const filters: Array<(r: Row) => boolean> = [];
    let mode: 'select' | 'delete' = 'select';
    const q: any = {
      select() {
        mode = 'select';
        return q;
      },
      delete() {
        mode = 'delete';
        return q;
      },
      eq(k: string, v: unknown) {
        filters.push((r) => r[k] === v);
        return q;
      },
      gte(k: string, v: string) {
        filters.push((r) => String(r[k]) >= v);
        return q;
      },
      lt(k: string, v: string) {
        filters.push((r) => String(r[k]) < v);
        return q;
      },
      insert(row: Row) {
        if (opts.failInsertOn?.includes(table)) {
          return Promise.resolve({ error: { message: 'duplicate key', code: '23505' } });
        }
        const key = opts.unique?.[table];
        if (key && rows(table).some((r) => r[key] === row[key])) {
          return Promise.resolve({ error: { message: 'duplicate key', code: '23505' } });
        }
        rows(table).push({ created_at: new Date().toISOString(), ...row });
        return Promise.resolve({ error: null });
      },
      maybeSingle() {
        const found = rows(table).find((r) => filters.every((f) => f(r))) ?? null;
        return Promise.resolve({ data: found, error: null });
      },
      then(resolve: (v: unknown) => void) {
        const match = (r: Row) => filters.every((f) => f(r));
        if (mode === 'delete') {
          tables[table] = rows(table).filter((r) => !match(r));
          return resolve({ error: null });
        }
        return resolve({ count: rows(table).filter(match).length, error: null });
      },
    };
    return q;
  }

  return { tables, from: (t: string) => query(t) };
}
