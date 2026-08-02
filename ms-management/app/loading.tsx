export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 flex flex-col gap-6 animate-pulse select-none">
      <div className="h-20 rounded-2xl bg-slate-200/80 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="h-28 rounded-2xl bg-slate-200/80" />
        <div className="h-28 rounded-2xl bg-slate-200/80" />
        <div className="h-28 rounded-2xl bg-slate-200/80" />
        <div className="h-28 rounded-2xl bg-slate-200/80" />
      </div>
      <div className="h-96 rounded-3xl bg-slate-200/80 w-full" />
    </div>
  );
}
