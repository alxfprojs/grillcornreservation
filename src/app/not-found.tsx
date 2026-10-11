import Link from 'next/link';

/** 404. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="text-4xl" aria-hidden>
        🌽
      </div>
      <h1 className="mt-4 text-2xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-2 text-ink-600">
        That page has been eaten. Try the menu, or head back to the start.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back home
        </Link>
        <Link href="/menu" className="btn-secondary">
          See the menu
        </Link>
      </div>
    </div>
  );
}
