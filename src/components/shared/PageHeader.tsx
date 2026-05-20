type PageHeaderProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}>;

export function PageHeader({ eyebrow, title, description, action, className }: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className ?? ''}`}>
      <div>
        <p className="text-sm font-semibold text-[#8B5E3C]">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#1F1B18]">{title}</h1>
        <p className="mt-2 max-w-2xl text-[#7A7168]">{description}</p>
      </div>
      {action}
    </div>
  );
}
