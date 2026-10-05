export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-brand/10 dark:bg-brand-800/40" />
          <div className="h-4 w-72 rounded bg-brand/5 dark:bg-brand-800/20" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-brand/10 dark:bg-brand-800/40" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-brand/10 bg-surface p-4 dark:border-brand-200/10"
          >
            <div className="h-4 w-24 rounded bg-brand/10 dark:bg-brand-800/30" />
            <div className="mt-4 h-7 w-36 rounded bg-brand/15 dark:bg-brand-800/50" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-brand/10 bg-surface p-6 dark:border-brand-200/10">
        <div className="mb-4 h-5 w-40 rounded bg-brand/10 dark:bg-brand-800/40" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 w-full rounded-lg bg-brand/5 dark:bg-brand-800/20"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
