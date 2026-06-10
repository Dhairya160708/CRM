import { Header } from "@/components/layout/header";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Dashboard" subtitle="Overview of your trading operations" />
      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
                <div className="h-8 w-8 bg-secondary rounded-lg animate-pulse" />
              </div>
              <div className="h-9 w-14 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
              <div className="h-3.5 w-16 bg-secondary rounded animate-pulse" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex gap-2">
                      <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
                      <div className="h-3 w-16 bg-secondary/60 rounded animate-pulse" />
                    </div>
                    <div className="h-3.5 w-52 bg-secondary rounded animate-pulse" />
                    <div className="h-3 w-36 bg-secondary/50 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-4 bg-secondary rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="h-4 w-28 bg-secondary rounded animate-pulse" />
              </div>
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-5 w-24 bg-secondary rounded-full animate-pulse" />
                    <div className="h-4 w-6 bg-secondary rounded animate-pulse" />
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
