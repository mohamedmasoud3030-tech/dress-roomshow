import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';

/**
 * Minimal monitoring surface for the showroom admin.
 *
 * Operational errors already report into `client_error_events` (insert:
 * active users, select: admins only — migration 0016). Until now nobody could
 * see them without opening the Supabase console, so a failing journey could
 * repeat silently for weeks. This card answers one question honestly: "are
 * errors accumulating on the server side, and when was the latest one?"
 *
 * Deliberately read-only and count-level: row-level error browsing stays in
 * the console for the support operator; the counter UI must not become a
 * second log viewer to maintain.
 */

type ErrorsSummaryState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; total: number; latestAt: string | null };

async function fetchErrorsSummary(): Promise<ErrorsSummaryState> {
  try {
    if (typeof window === 'undefined' || !isSupabaseConfigured()) return { status: 'unavailable' };
    const client = getSupabaseClient();
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) return { status: 'unavailable' };

    const { data, count, error } = await client
      .from('client_error_events')
      .select('created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return { status: 'unavailable' };
    return {
      status: 'ready',
      total: count ?? 0,
      latestAt: Array.isArray(data) && data.length > 0 && typeof data[0]?.created_at === 'string'
        ? data[0].created_at
        : null,
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export function SystemErrorsSummary() {
  const [state, setState] = useState<ErrorsSummaryState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    setState({ status: 'loading' });
    setState(await fetchErrorsSummary());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <ShieldAlert aria-hidden="true" className="h-6 w-6 text-amber-700" />
        <div>
          <h2 className="text-lg font-bold">أخطاء النظام المسجلة</h2>
          <p className="mt-1 text-sm text-slate-500">عداد الأعطال التي تصل إلى سجل الخادم من أجهزة المعرض، مع آخر وقت حدوث.</p>
        </div>
      </div>

      {state.status === 'loading' && (
        <p role="status" className="mt-4 rounded-xl bg-stone-50 p-3 text-sm font-bold text-slate-600">جارٍ تحميل العداد…</p>
      )}

      {state.status === 'unavailable' && (
        <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-slate-600">
          العداد غير متاح الآن (لا اتصال أو صلاحية غير كافية). راجعي الدعم إذا تكررت الأعطال أمامك أثناء العمل.
        </p>
      )}

      {state.status === 'ready' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-3 text-sm">
          <div>
            <p className="font-bold text-slate-900">
              {state.total === 0 ? 'لا أخطاء مسجلة — الوضع سليم.' : `${state.total} حدثًا مسجلًا.`}
            </p>
            {state.latestAt && (
              <p className="mt-1 text-xs text-slate-500">آخر حدث: {new Date(state.latestAt).toLocaleString('ar-OM')}</p>
            )}
            {state.total > 0 && (
              <p className="mt-1 text-xs text-slate-500">إذا تسارع العدد أو لاحظتِ عطلًا متكررًا، أخبري الدعم برقم الإصدار من قسم «عن التطبيق».</p>
            )}
          </div>
          <Button type="button" variant="secondary" onClick={() => void refresh()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            تحديث
          </Button>
        </div>
      )}
    </article>
  );
}
