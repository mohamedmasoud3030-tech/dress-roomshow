import { formatDressStatusLabel, getDresses } from './dress.service';

export function DressesPage() {
  const dresses = getDresses();

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">إدارة الفساتين</h1>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dresses.map((dress) => (
          <article key={dress.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{dress.code}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{dress.name}</h2>
            <p className="text-sm text-slate-600">{dress.color} — المقاس {dress.size}</p>
            <p className="mt-2 text-sm font-medium text-violet-700">{formatDressStatusLabel(dress.status)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
