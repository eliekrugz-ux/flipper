import { CheckForm } from "./CheckForm";

export const metadata = { title: "Flipper Check" };

const CHECK_URL = process.env.NEXT_PUBLIC_WHOP_CHECK_URL || "#";

export default function CheckPage() {
  return (
    <main className="wrap">
      <div className="grid12 gap-y-10 pt-12">
        <div className="col-span-12 md:col-span-5">
          <div className="label"><span className="sec-num">$7</span> · per listing</div>
          <h1 className="display mt-3 text-6xl sm:text-7xl">Flipper<br /><span className="chrome-text">Check.</span></h1>
          <p className="mt-6 text-ink-2">
            Paste a Reverb or Discogs listing. Flipper pulls comps for the exact item, subtracts fees, shipping
            and a safety buffer, and tells you <b className="text-ink">BUY</b>, <b className="text-ink">PASS</b> or{" "}
            <b className="text-ink">OFFER $X</b>.
          </p>
          <ol className="mt-8 border-t-[3px] border-ink">
            <li className="grid grid-cols-[2.5rem_1fr] border-b border-hair py-4">
              <span className="font-mono text-red">01</span>
              <span><a href={CHECK_URL} className="font-bold underline decoration-red decoration-2 underline-offset-4">Buy a Check on Whop</a></span>
            </li>
            <li className="grid grid-cols-[2.5rem_1fr] border-b border-hair py-4">
              <span className="font-mono text-red">02</span>
              <span>Paste the listing link and the email you used at checkout.</span>
            </li>
            <li className="grid grid-cols-[2.5rem_1fr] border-b border-hair py-4">
              <span className="font-mono text-red">03</span>
              <span>Get the verdict and the math behind it.</span>
            </li>
          </ol>
        </div>
        <div className="col-span-12 md:col-span-6 md:col-start-7">
          <CheckForm />
        </div>
      </div>
    </main>
  );
}
