import Link from "next/link";
import { CheckForm } from "./CheckForm";

export const metadata = { title: "Flipper Check" };

const CHECK_URL = process.env.NEXT_PUBLIC_WHOP_CHECK_URL || "#";

export default function CheckPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <Link href="/" className="font-mono text-sm text-neutral-500">← Flipper</Link>
      <h1 className="mt-4 text-3xl font-bold">Flipper Check</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Paste a Reverb or Discogs listing. Flipper&apos;s agents pull comps for the exact item, subtract
        fees, shipping and a safety buffer, and tell you <b>BUY</b>, <b>PASS</b> or <b>OFFER $X</b>.
      </p>
      <ol className="mt-6 list-decimal space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
        <li>
          <a href={CHECK_URL} className="font-semibold text-neutral-900 underline dark:text-neutral-100">Buy a Check on Whop</a>.
        </li>
        <li>Come back here, paste the listing link and the email you used at checkout.</li>
      </ol>
      <CheckForm />
    </main>
  );
}
