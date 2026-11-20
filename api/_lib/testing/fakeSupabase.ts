// In-memory stand-in for the small slice of the Supabase query builder the API
// uses (insert, upsert, update().eq().is().gt().select().maybeSingle(),
// delete().lt(), select(count, head).gte().eq(), select().in().order().limit()
// returning rows, insert([...]).select().single(), and 'col->>key' JSON filters). Test-only:
// imported from *.test.ts files, never from an endpoint.

type Row = Record<string, unknown>;

export interface FakeDb {
  tables: Record<string, Row[]>;
  from(table: string): any;
}

export function fakeSupabase(
  opts: { failInsertOn?: string[]; unique?: Record<string, string>; autoId?: string[] } = {},
): FakeDb {
  const tables: Record<string, Row[]> = {};
  const rows = (t: string) => (tables[t] ??= []);

  function query(table: string) {
    const filters: Array<(r: Row) => boolean> = [];
    let mode: 'select' | 'delete' | 'update' = 'select';
    let patch: Row = {};
    let sortBy: { k: string; asc: boolean } | null = null;
    let max = Infinity;
    let inserted: Row[] = [];
    const result = () => {
      let out = rows(table).filter((r) => filters.every((f) => f(r)));
      if (sortBy) {
        const { k, asc } = sortBy;
        out = [...out].sort((a, b) => (String(a[k]) < String(b[k]) ? -1 : String(a[k]) > String(b[k]) ? 1 : 0) * (asc ? 1 : -1));
      }
      return out.slice(0, max);
    };
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
        const keys = o.onConflict ? o.onConflict.split(',').map((k) => k.trim()) : [];
        const existing = keys.length ? rows(table).find((r) => keys.every((k) => r[k] === row[k])) : undefined;
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
      in(k: string, vs: unknown[]) {
        filters.push((r) => vs.includes(r[k]));
        return q;
      },
      order(k: string, o: { ascending?: boolean } = {}) {
        sortBy = { k, asc: o.ascending !== false };
        return q;
      },
      limit(n: number) {
        max = n;
        return q;
      },
      single() {
        if (inserted.length) return Promise.resolve({ data: inserted[0], error: null });
        const found = result()[0] ?? null;
        return Promise.resolve(found ? { data: found, error: null } : { data: null, error: { message: 'no rows' } });
      },
      insert(input: Row | Row[]) {
        const fail = { error: { message: 'duplicate key', code: '23505' } };
        const failed = () => {
          const p: any = Promise.resolve(fail);
          p.select = () => ({ single: () => Promise.resolve({ data: null, ...fail }) });
          return p;
        };
        if (opts.failInsertOn?.includes(table)) return failed();
        const list = Array.isArray(input) ? input : [input];
        const key = opts.unique?.[table];
        if (key && list.some((row) => rows(table).some((r) => r[key] === row[key]))) return failed();
        inserted = list.map((row) => {
          const id = opts.autoId?.includes(table) && row.id === undefined ? { id: rows(table).length + 1 } : {};
          const full = { created_at: new Date().toISOString(), built_at: new Date().toISOString(), ...id, ...row };
          rows(table).push(full);
          return full;
        });
        const p: any = Promise.resolve({ error: null });
        p.select = () => ({ single: () => Promise.resolve({ data: inserted[0], error: null }) });
        return p;
      },
      maybeSingle() {
        const found = result()[0] ?? null;
        if (mode === 'update' && found) Object.assign(found, patch);
        return Promise.resolve({ data: found, error: null });
      },
      then(resolve: (v: unknown) => void) {
        const match = (r: Row) => filters.every((f) => f(r));
        if (mode === 'delete') {
          tables[table] = rows(table).filter((r) => !match(r));
          return resolve({ error: null });
        }
        if (mode === 'update') {
          rows(table).filter(match).forEach((r) => Object.assign(r, patch));
          return resolve({ error: null });
        }
        const data = result();
        return resolve({ data, count: data.length, error: null });
      },
    };
    return q;
  }

  return { tables, from: (t: string) => query(t) };
}
