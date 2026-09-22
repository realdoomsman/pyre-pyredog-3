import { useRef, useState } from "react";
import { HolderGate, LoginButton, usePyre } from "@pyre/app-sdk/react";
import { Button, Card, Checkbox, Chip, Input, MemeCanvas, OptionGrid, memeWords } from "./components";
import { STOCK_DOGS, dogById } from "./lib/dogs";
import { FRAMES, STICKERS } from "./lib/frames";
import { VOICES, failureText, saveMeme, suggestCaptions, type CaptionsResult } from "./lib/api";
import { compressPhoto, decodeUpload, downloadPng, emptySpec, type MemeSpec } from "./lib/render";

interface StudioProps {
  ticker: string;
  minHold: string;
  /** Called after a successful save so the gallery and wall reload. */
  onSaved: () => void;
}

interface Photo {
  bitmap: ImageBitmap;
  encoded: string | null;
  name: string;
}

const FREE_FRAMES = FRAMES.filter((f) => !f.legendary).map((f) => ({ value: f.id, label: f.label }));
const LEGENDARY_FRAMES = FRAMES.filter((f) => f.legendary).map((f) => ({ value: f.id, label: f.label }));
const FREE_VOICES = VOICES.filter((v) => !v.holderOnly).map((v) => ({ value: v.id, label: v.label }));
const HOLDER_VOICES = VOICES.filter((v) => v.holderOnly).map((v) => ({ value: v.id, label: v.label }));

const SOURCE_NOTE: Record<CaptionsResult["source"], string> = {
  model: "from the model",
  mixed: "part model, part local",
  offline: "written locally — the model was unreachable",
};

export function Studio({ ticker, minHold, onSaved }: StudioProps) {
  const { user } = usePyre();
  const [spec, setSpec] = useState<MemeSpec>(emptySpec);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [vibe, setVibe] = useState("");
  const [voice, setVoice] = useState("deadpan");
  const [ideas, setIdeas] = useState<CaptionsResult | null>(null);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  const [share, setShare] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const patch = (next: Partial<MemeSpec>): void => setSpec((prev) => ({ ...prev, ...next }));
  const hasText = spec.topText.trim() !== "" || spec.bottomText.trim() !== "";

  const pickDog = (id: string): void => {
    setPhoto(null);
    setPhotoError(null);
    if (fileRef.current !== null) fileRef.current.value = "";
    patch({ dogId: id });
    // Seed the caption prompt with the picture's own vibe, so ideas are one click away.
    setVibe((prev) => (prev.trim() === "" ? (dogById(id)?.vibe ?? "") : prev));
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return;
    setPhotoError(null);
    try {
      const bitmap = await decodeUpload(file);
      const encoded = compressPhoto(bitmap);
      setPhoto({ bitmap, encoded, name: file.name });
      patch({ dogId: null });
      if (encoded === null) {
        setPhotoError("this photo is too detailed to store; you can still download the meme.");
      }
    } catch {
      setPhotoError("that file could not be read as an image. try a png or jpg.");
    }
  };

  const runSuggest = async (): Promise<void> => {
    setIdeasBusy(true);
    setIdeasError(null);
    try {
      setIdeas(await suggestCaptions(vibe, voice));
    } catch (cause) {
      setIdeas(null);
      setIdeasError(failureText(cause, "the caption service did not answer. try again."));
    } finally {
      setIdeasBusy(false);
    }
  };

  const runDownload = async (): Promise<void> => {
    setDownloadError(null);
    try {
      await downloadPng(spec, photo?.bitmap ?? null, ticker);
    } catch (cause) {
      setDownloadError(failureText(cause, "the png could not be created."));
    }
  };

  const runSave = async (): Promise<void> => {
    setSaving(true);
    setSaveError(null);
    setSaveNote(null);
    try {
      const result = await saveMeme(spec, photo?.encoded ?? null, share);
      if (result.ok) {
        const count = `${result.saved ?? 0} of ${result.isHolder === true ? "unlimited" : (result.limit ?? 5)} saved`;
        const wall =
          result.filtered === true
            ? " the wall filter held it back, so it stayed private."
            : result.shared === true
              ? " it is on the public wall."
              : " kept private.";
        setSaveNote(`saved — ${count}.${wall}`);
        onSaved();
      } else if (result.reason === "limit") {
        setSaveError(
          `a free gallery holds ${result.limit ?? 5} memes. delete one, or hold ${minHold} ${ticker} for unlimited saves.`,
        );
      } else if (result.reason === "cap") {
        setSaveError("that gallery is full. delete a meme to make room.");
      } else if (result.reason === "no_text") {
        setSaveError("add a top or bottom line first.");
      } else if (result.reason === "no_picture") {
        setSaveError("uploaded photos need to be storable to save; pick a stock dog instead.");
      } else {
        setSaveError("sign in again to save to your gallery.");
      }
    } catch (cause) {
      setSaveError(failureText(cause, "the meme could not be saved. try again."));
    } finally {
      setSaving(false);
    }
  };

  const dogLabel = photo !== null ? photo.name : (dogById(spec.dogId)?.label ?? "no picture");

  return (
    <Card
      actions={<Chip tone="violet">{dogLabel.slice(0, 22)}</Chip>}
      description="pick a picture, add two lines, stamp a frame. nothing leaves the page until you save."
      title="Studio"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <MemeCanvas
            alt={`meme preview: ${memeWords(spec)}`}
            photo={photo?.bitmap ?? null}
            spec={spec}
            ticker={ticker}
          />
          <div className="flex flex-wrap gap-2">
            <Button data-testid="download" disabled={!hasText} onClick={() => void runDownload()}>
              Download png
            </Button>
            {user !== null ? (
              <Button disabled={saving || !hasText} onClick={() => void runSave()} variant="secondary">
                {saving ? "Saving…" : "Save to gallery"}
              </Button>
            ) : (
              <LoginButton className="inline-flex h-10 items-center rounded-card border border-border bg-surface px-4 text-sm font-medium text-ink hover:border-border-strong">
                Log in to save
              </LoginButton>
            )}
          </div>
          <Checkbox
            checked={share}
            disabled={user === null}
            label="also post it to the public wall"
            onChange={(e) => setShare(e.target.checked)}
          />
          {!hasText ? (
            <p className="text-sm text-ink-faint">add a line of text to enable the download.</p>
          ) : null}
          {saveNote !== null ? (
            <p className="text-sm text-ink" data-testid="save-note" role="status">
              {saveNote}
            </p>
          ) : null}
          {saveError !== null ? (
            <p className="text-sm text-danger" role="alert">
              {saveError}
            </p>
          ) : null}
          {downloadError !== null ? (
            <p className="text-sm text-danger" role="alert">
              {downloadError}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <OptionGrid
            legend="Stock dog"
            onChange={pickDog}
            options={STOCK_DOGS.map((dog) => ({ value: dog.id, label: dog.label }))}
            value={photo === null ? (spec.dogId ?? "") : ""}
          />

          <div className="min-w-0">
            <label className="mb-2 block text-sm text-ink-muted" htmlFor="own-photo">
              Or your own photo
            </label>
            <input
              accept="image/*"
              className="block w-full cursor-pointer rounded-card border border-border bg-bg p-2 text-sm text-ink-muted hover:border-border-strong file:mr-3 file:cursor-pointer file:rounded-card file:border-0 file:bg-violet file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-bg"
              id="own-photo"
              onChange={(e) => void onFile(e.target.files?.[0])}
              ref={fileRef}
              type="file"
            />
            {photoError !== null ? (
              <p className="mt-1.5 text-sm text-danger" role="alert">
                {photoError}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-ink-faint">
                stays in your browser; saving stores a small thumbnail of it.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Top line"
              maxLength={100}
              onChange={(e) => patch({ topText: e.target.value })}
              placeholder="when the chart moves"
              value={spec.topText}
            />
            <Input
              label="Bottom line"
              maxLength={100}
              onChange={(e) => patch({ bottomText: e.target.value })}
              placeholder="and you are just a dog"
              value={spec.bottomText}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-4">
            <Input
              hint="one line about the moment, and the model writes five captions."
              label="Caption ideas"
              maxLength={240}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="dog watching me eat toast"
              value={vibe}
            />
            <OptionGrid legend="Voice" onChange={setVoice} options={FREE_VOICES} value={voice} />
            <HolderGate
              fallback={
                <p className="text-sm text-ink-faint">
                  hold <span className="font-mono tabular-nums text-ink-muted">{minHold}</span> {ticker} for four more
                  voices: noir, announcer, bard, monk.
                </p>
              }
            >
              <OptionGrid legend="Holder voices" onChange={setVoice} options={HOLDER_VOICES} value={voice} />
            </HolderGate>
            <div>
              <Button data-testid="suggest" disabled={ideasBusy} onClick={() => void runSuggest()} size="sm">
                {ideasBusy ? "Writing…" : "Suggest 5 captions"}
              </Button>
            </div>
            {ideasBusy ? (
              <p className="text-sm text-ink-muted" role="status">
                asking the model for five takes…
              </p>
            ) : ideasError !== null ? (
              <p className="text-sm text-danger" role="alert">
                {ideasError}
              </p>
            ) : ideas !== null ? (
              <div className="flex flex-col gap-2" data-testid="ideas">
                <p className="font-mono text-xs text-ink-faint">
                  {SOURCE_NOTE[ideas.source]}
                  {ideas.downgraded ? " · that voice is holders-only, so these are deadpan" : ""}
                </p>
                {ideas.captions.map((caption) => (
                  <button
                    className="rounded-card border border-border bg-surface px-3 py-2 text-left text-sm text-ink-muted transition-colors hover:border-violet hover:text-ink"
                    key={caption}
                    onClick={() => patch({ bottomText: caption.slice(0, 100) })}
                    type="button"
                  >
                    {caption}
                  </button>
                ))}
                <p className="text-sm text-ink-faint">pick one to drop it into the bottom line.</p>
              </div>
            ) : (
              <p className="text-sm text-ink-faint">no ideas yet.</p>
            )}
          </div>

          <OptionGrid
            legend="Frame"
            onChange={(id) => patch({ frameId: id })}
            options={FREE_FRAMES}
            value={spec.frameId}
          />
          <HolderGate
            fallback={
              <p className="text-sm text-ink-faint">
                legendary frames — aurora and crest — unlock at{" "}
                <span className="font-mono tabular-nums text-ink-muted">{minHold}</span> {ticker}.
              </p>
            }
          >
            <OptionGrid
              legend="Legendary frames"
              onChange={(id) => patch({ frameId: id })}
              options={LEGENDARY_FRAMES}
              value={spec.frameId}
            />
          </HolderGate>
          <OptionGrid
            legend="Sticker"
            onChange={(id) => patch({ stickerId: id })}
            options={STICKERS.map((s) => ({ value: s.id, label: s.label }))}
            value={spec.stickerId}
          />
        </div>
      </div>
    </Card>
  );
}
