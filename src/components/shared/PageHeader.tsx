type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-violet-700">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
    </div>
  );
}
