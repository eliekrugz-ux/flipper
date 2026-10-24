import Link from "next/link";

export function Header() {
  return (
    <header className="wrap pt-5">
      <div className="flex items-center justify-between gap-4 pb-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Flipper home">
          <span className="inline-block h-3 w-3 rounded-full bg-red" />
          <span className="display text-2xl">FLIPPER</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/deals" className="hover:text-red">Deals</Link>
          <Link href="/check" className="hover:text-red">Check</Link>
        </nav>
      </div>
      <div className="rule" />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="wrap mt-24 pb-10">
      <div className="rule" />
      <div className="grid12 gap-y-4 pt-4 text-xs">
        <div className="col-span-12 md:col-span-6">
          <div className="chrome-text display text-5xl">FLIPPER</div>
          <p className="mt-2 max-w-sm text-ink-2">
            Not financial advice. No guaranteed profit. Buy at your own risk. Payments by Whop.
          </p>
        </div>
        <div className="col-span-6 md:col-span-3">
          <div className="label mb-2">Product</div>
          <ul className="space-y-1">
            <li><Link href="/deals" className="hover:text-red">Track record</Link></li>
            <li><Link href="/check" className="hover:text-red">Flipper Check</Link></li>
          </ul>
        </div>
        <div className="col-span-6 md:col-span-3">
          <div className="label mb-2">Legal</div>
          <ul className="space-y-1">
            <li><Link href="/legal/terms" className="hover:text-red">Terms</Link></li>
            <li><Link href="/legal/refunds" className="hover:text-red">Refunds</Link></li>
            <li><Link href="/legal/disclaimer" className="hover:text-red">Disclaimer</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

// Swiss section heading: red number, hairline, title.
export function Section({ n, title, children }: { n: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mt-20">
      <div className="hair" />
      <div className="grid12 pt-3">
        <div className="col-span-2 md:col-span-1 label"><span className="sec-num">{n}</span></div>
        <h2 className="col-span-10 md:col-span-11 display text-3xl sm:text-4xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}
