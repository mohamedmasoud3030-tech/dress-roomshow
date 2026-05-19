import { CustomersPage } from '../../features/customers/CustomersPage';

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  if (title === '\u0627\u0644\u0639\u0645\u0644\u0627\u0621') {
    return <CustomersPage />;
  }

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
      <p className="text-sm font-medium text-violet-700">In progress</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">This page is part of the approved roadmap.</p>
    </section>
  );
}
