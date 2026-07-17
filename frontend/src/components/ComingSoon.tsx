export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-app px-1 py-16 text-center">
      <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-[14px] text-slate">
        This part of the wallet arrives in the next build step. Your funds and Pacts are unaffected.
      </p>
    </div>
  );
}
