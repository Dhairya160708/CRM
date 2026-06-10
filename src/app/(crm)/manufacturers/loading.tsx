import { Header } from "@/components/layout/header";

export default function ManufacturersLoading() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Manufacturers" subtitle="Loading..." />
      <main className="flex-1 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-64 bg-secondary rounded-lg animate-pulse" />
          <div className="h-9 w-36 bg-secondary rounded-lg animate-pulse ml-auto" />
        </div>
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {["Name", "Location", "Certifications", "Orders", "Rating", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><div className="h-3.5 w-40 bg-secondary rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3.5 w-28 bg-secondary rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="flex gap-1"><div className="h-5 w-12 bg-secondary rounded animate-pulse" /><div className="h-5 w-10 bg-secondary rounded animate-pulse" /></div></td>
                  <td className="px-4 py-3"><div className="h-3.5 w-8 bg-secondary rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-3.5 w-20 bg-secondary rounded animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-5 w-16 bg-secondary rounded-full animate-pulse" /></td>
                  <td className="px-4 py-3"><div className="h-6 w-14 bg-secondary rounded animate-pulse" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
