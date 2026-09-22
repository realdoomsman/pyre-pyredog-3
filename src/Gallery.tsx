import { useCallback, useEffect, useState } from "react";
import { LoginButton, usePyre } from "@pyre/app-sdk/react";
import { Button, Card, Chip, EmptyState, MemeTile } from "./components";
import { deleteMeme, failureText, listGallery } from "./lib/api";
import type { MemeRecord } from "./lib/render";

interface GalleryProps {
  ticker: string;
  minHold: string;
  /** Bumped by the studio after a save. */
  refreshKey: number;
}

/** The signed-in user's saved memes. Free accounts keep 5; holders are unlimited. */
export function Gallery({ ticker, minHold, refreshKey }: GalleryProps) {
  const { user, loading: sessionLoading } = usePyre();
  const [items, setItems] = useState<MemeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(5);
  const [unlimited, setUnlimited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (offset: number): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const result = await listGallery(offset);
        if (!result.ok) {
          setError("sign in again to see your gallery.");
          return;
        }
        setItems((prev) => (offset === 0 ? result.items : [...prev, ...result.items]));
        setTotal(result.total);
        setLimit(result.limit);
        setUnlimited(result.isHolder);
      } catch (cause) {
        setError(failureText(cause, "your gallery did not load. try again."));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (user === null) {
      setItems([]);
      setTotal(0);
      return;
    }
    void load(0);
  }, [user, refreshKey, load]);

  const remove = async (id: string): Promise<void> => {
    setBusyId(id);
    setError(null);
    try {
      const result = await deleteMeme(id);
      if (!result.ok) {
        setError("that meme could not be deleted.");
        return;
      }
      setItems((prev) => prev.filter((meme) => meme.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (cause) {
      setError(failureText(cause, "that meme could not be deleted."));
    } finally {
      setBusyId(null);
    }
  };

  const quota = unlimited ? `${total} saved` : `${total} of ${limit} saved`;

  return (
    <Card
      actions={user !== null ? <Chip tone={unlimited ? "violet" : "neutral"}>{quota}</Chip> : null}
      description={
        unlimited
          ? "holder gallery: unlimited saves."
          : `free galleries keep ${limit} memes; holding ${minHold} ${ticker} removes the cap.`
      }
      title="Your gallery"
    >
      {user === null ? (
        <EmptyState
          action={
            <LoginButton className="inline-flex h-10 items-center rounded-card bg-violet px-4 text-sm font-medium text-bg hover:bg-violet-hover">
              Log in
            </LoginButton>
          }
          description={
            sessionLoading ? "checking your session…" : "memes you save are tied to your login and stay yours."
          }
          title="Nothing saved yet"
        />
      ) : error !== null ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
          <Button onClick={() => void load(0)} size="sm" variant="secondary">
            Try again
          </Button>
        </div>
      ) : loading && items.length === 0 ? (
        <p className="text-sm text-ink-muted" role="status">
          loading your memes…
        </p>
      ) : items.length === 0 ? (
        <EmptyState description="build one in the studio, then save it here." title="Nothing saved yet" />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((meme) => (
              <li className="min-w-0" key={meme.id}>
                <MemeTile
                  action={
                    <Button
                      disabled={busyId === meme.id}
                      onClick={() => void remove(meme.id)}
                      size="sm"
                      variant="ghost"
                    >
                      {busyId === meme.id ? "Deleting…" : "Delete"}
                    </Button>
                  }
                  record={meme}
                  ticker={ticker}
                />
              </li>
            ))}
          </ul>
          {items.length < total ? (
            <div>
              <Button disabled={loading} onClick={() => void load(items.length)} size="sm" variant="secondary">
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
