export default function CRMLoading() {
  return (
    <div className="flex flex-col flex-1 animate-pulse">
      {/* Header skeleton */}
      <div className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-secondary rounded" />
          <div className="h-3 w-24 bg-secondary/60 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-56 bg-secondary rounded-lg hidden md:block" />
          <div className="h-8 w-8 bg-secondary rounded-lg" />
          <div className="h-8 w-8 bg-secondary rounded-lg" />
        </div>
      </div>

      {/* Content skeleton */}
      <main className="flex-1 p-6 space-y-5">
        {/* Top row cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-secondary rounded" />
                <div className="h-8 w-8 bg-secondary rounded-lg" />
              </div>
              <div className="h-8 w-16 bg-secondary rounded" />
            </div>
          ))}
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="h-4 w-36 bg-secondary rounded" />
            </div>
            <div className="divide-y divide-border">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2">
                      <div className="h-3 w-20 bg-secondary rounded" />
                      <div className="h-3 w-16 bg-secondary/60 rounded" />
                    </div>
                    <div className="h-3.5 w-48 bg-secondary rounded" />
                    <div className="h-3 w-32 bg-secondary/50 rounded" />
                  </div>
                  <div className="h-4 w-4 bg-secondary rounded" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="h-4 w-28 bg-secondary rounded" />
              </div>
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-5 w-24 bg-secondary rounded-full" />
                    <div className="h-4 w-8 bg-secondary rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
