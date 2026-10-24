import { SupportForm } from "./SupportForm";

export const metadata = { title: "Support — Flipper" };

export default function SupportPage() {
  return (
    <main className="wrap">
      <div className="grid12 gap-y-10 pt-12">
        <div className="col-span-12 md:col-span-5">
          <div className="label"><span className="sec-num">?</span> · answers in seconds</div>
          <h1 className="display mt-3 text-6xl sm:text-7xl">Questions<span className="text-red">.</span></h1>
          <p className="mt-6 text-ink-2">
            Ask about Founding Seats, Flipper Check, how deals are priced, or our policies. Refunds and billing go
            through Whop, where your purchase lives.
          </p>
        </div>
        <div className="col-span-12 md:col-span-6 md:col-start-7">
          <SupportForm />
        </div>
      </div>
    </main>
  );
}
