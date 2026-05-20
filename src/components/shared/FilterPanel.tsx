type FilterPanelProps = Readonly<{
  children: React.ReactNode;
  className?: string;
}>;

export function FilterPanel({ children, className }: FilterPanelProps) {
  return <div className={`rounded-2xl border border-[#E8DED2] bg-white p-4 shadow-sm ${className ?? ''}`}>{children}</div>;
}
