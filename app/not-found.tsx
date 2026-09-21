import Link from "next/link";

export default function NotFound() {
  return (
    <main className="arena-container min-h-[calc(100vh-74px)] flex items-center justify-center py-12">
      <section className="arena-card w-full max-w-3xl overflow-hidden p-6 sm:p-10" aria-labelledby="not-found-title">
        <div className="grid gap-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div aria-hidden="true" className="font-display text-[clamp(5rem,24vw,10rem)] font-bold leading-none tracking-[-0.09em] text-arena-accent">
            404
          </div>
          <div className="min-w-0">
            <div className="arena-eyebrow mb-3">Out of bounds</div>
            <h1 id="not-found-title" className="font-display text-3xl sm:text-5xl font-bold leading-tight tracking-tight">
              This page missed the arena.
            </h1>
            <p className="mt-3 max-w-lg text-sm sm:text-base leading-relaxed text-arena-muted">
              The link may be broken, expired, or moved. Head back home and choose your next challenge.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/" className="arena-btn arena-btn-primary justify-center">
                Return home
              </Link>
              <Link href="/idol" className="arena-btn arena-btn-ghost justify-center">
                Play Know Your Idol
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
