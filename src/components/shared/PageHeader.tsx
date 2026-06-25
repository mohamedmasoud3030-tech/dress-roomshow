type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div>
      <p className="text-sm font-bold text-amber-700">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}
