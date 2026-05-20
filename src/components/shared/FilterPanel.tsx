type FilterPanelProps = { children: React.ReactNode };

export function FilterPanel({ children }: FilterPanelProps) {
  return <div className="rounded-2xl border border-[#E8DED2] bg-white p-4 shadow-sm">{children}</div>;
}
