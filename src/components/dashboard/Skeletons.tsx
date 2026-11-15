const sk = 'animate-pulse rounded-xl bg-white/[0.06]'

export default function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading experiments" className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${sk} h-28`} />
        ))}
      </div>
      <div className={`${sk} h-36`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${sk} h-96`} />
        <div className={`${sk} h-96`} />
        <div className={`${sk} h-96 lg:col-span-2`} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${sk} h-52`} />
        ))}
      </div>
    </div>
  )
}