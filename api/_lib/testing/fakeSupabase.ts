// In-memory stand-in for the small slice of the Supabase query builder the API
// uses (insert, upsert, update().eq().is().gt().select().maybeSingle(),
// delete().lt(), select(count, head).gte().eq(), and 'col->>key' JSON filters). Test-only:
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
    let mode: 'select' | 'delete' | 'update' = 'select';
    let patch: Row = {};
    // 'detail->>ip_hash' reads a key of a JSON column, like PostgREST.
    const get = (r: Row, k: string) => {
      const [col, key] = k.split('->>');
      if (key === undefined) return r[col];
      const v = r[col] as Row | null | undefined;
      return v == null ? undefined : v[key];
    };
    const q: any = {
      select() {
        if (mode !== 'update') mode = 'select';
        return q;
      },
      update(row: Row) {
        mode = 'update';
        patch = row;
        return q;
      },
      upsert(row: Row, o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
        const key = o.onConflict;
        const existing = key ? rows(table).find((r) => r[key] === row[key]) : undefined;
        if (existing) {
          if (!o.ignoreDuplicates) Object.assign(existing, row);
        } else {
          rows(table).push({ created_at: new Date().toISOString(), ...row });
        }
        return Promise.resolve({ error: null });
      },
      delete() {
        mode = 'delete';
        return q;
      },
      eq(k: string, v: unknown) {
        filters.push((r) => get(r, k) === v);
        return q;
      },
      is(k: string, v: null) {
        filters.push((r) => (r[k] ?? null) === v);
        return q;
      },
      gt(k: string, v: string) {
        filters.push((r) => String(r[k]) > v);
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
        if (mode === 'update' && found) Object.assign(found, patch);
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
