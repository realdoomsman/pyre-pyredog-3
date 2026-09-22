import { useState } from "react";
import { pyreEnv } from "@pyre/app-sdk";
import { LoginButton, usePyre } from "@pyre/app-sdk/react";
import { Gallery } from "./Gallery";
import { Studio } from "./Studio";
import { Wall } from "./Wall";
import { PageHeader } from "./components";

export default function App() {
  const env = pyreEnv();
  const { user, holder } = usePyre();
  const [refreshKey, setRefreshKey] = useState(0);

  const ticker = env.ticker !== undefined && env.ticker !== "" ? `$${env.ticker}` : "the coin";
  const minHold = String(env.holderMin ?? holder.minHold);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        actions={
          <LoginButton className="inline-flex h-10 items-center rounded-card border border-border bg-surface px-4 text-sm font-medium text-ink hover:border-border-strong">
            Log in
          </LoginButton>
        }
        description="pick a dog, get five caption ideas, stamp a frame, download the png. free, no account needed to make one."
        eyebrow={env.ticker !== undefined && env.ticker !== "" ? `$${env.ticker}` : "pyre app"}
        title={env.name ?? "Pyredog Meme Maker"}
      />

      <Studio minHold={minHold} onSaved={() => setRefreshKey((k) => k + 1)} ticker={ticker} />
      <Gallery minHold={minHold} refreshKey={refreshKey} ticker={ticker} />
      <Wall refreshKey={refreshKey} ticker={ticker} />

      <footer className="mt-auto border-t border-border pt-6 text-sm text-ink-faint">
        {user !== null ? `signed in as ${user.displayName ?? user.wallet ?? user.id}. ` : ""}
        holder perks unlock at <span className="font-mono tabular-nums">{minHold}</span> {ticker}. built on Pyre.
      </footer>
    </div>
  );
}
