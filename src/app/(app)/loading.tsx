export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-64 rounded-lg bg-stone-200/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-stone-200/60" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 rounded-2xl bg-stone-200/60 lg:col-span-2" />
        <div className="h-80 rounded-2xl bg-stone-200/60" />
      </div>
    </div>
  );
}
