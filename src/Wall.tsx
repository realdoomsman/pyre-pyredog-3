import { useCallback, useEffect, useState } from "react";
import { Button, Card, Chip, EmptyState, MemeTile } from "./components";
import { failureText, listWall } from "./lib/api";
import type { MemeRecord } from "./lib/render";

interface WallProps {
  ticker: string;
  refreshKey: number;
}

/** The latest 20 shared memes. Open to everyone, loaded on page load. */
export function Wall({ ticker, refreshKey }: WallProps) {
  const [items, setItems] = useState<MemeRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await listWall();
      setItems(Array.isArray(result.items) ? result.items : []);
    } catch (cause) {
      setError(failureText(cause, "the wall did not load. try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <Card
      actions={
        <>
          {items !== null ? <Chip>{`${items.length} of 20`}</Chip> : null}
          <Button disabled={loading} onClick={() => void load()} size="sm" variant="secondary">
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </>
      }
      description="the twenty most recent memes anyone shared. basic word filter, no comments, no scores."
      title="Public wall"
    >
      {error !== null ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
          <Button onClick={() => void load()} size="sm" variant="secondary">
            Try again
          </Button>
        </div>
      ) : items === null ? (
        <p className="text-sm text-ink-muted" role="status">
          loading the wall…
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          data-testid="wall-empty"
          description="nothing shared yet. make one in the studio and post it."
          title="The wall is empty"
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((meme) => (
            <li className="min-w-0" key={meme.id}>
              <MemeTile record={meme} ticker={ticker} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
