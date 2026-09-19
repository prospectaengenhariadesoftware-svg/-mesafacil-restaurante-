export default function TenantLoading() {
  return (
    <main className="min-h-screen bg-[#fbfafc] px-4 py-6 text-slate-950 sm:px-6">
      <section className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-50 text-red-700">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
            </span>
            <div>
              <p className="text-sm font-semibold text-red-700">Abrindo módulo...</p>
              <h1 className="text-2xl font-bold tracking-tight">Carregando informações do restaurante</h1>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        </div>
      </section>
    </main>
  );
}
