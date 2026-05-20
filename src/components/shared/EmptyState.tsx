type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[#E8DED2] bg-white p-10 text-center shadow-sm">
      <p className="text-lg font-semibold text-[#1F1B18]">{title}</p>
      <p className="mt-2 text-sm text-[#7A7168]">{description}</p>
    </div>
  );
}
