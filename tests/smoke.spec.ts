import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

/**
 * The deployment manifest is the source of truth for the app's name; the page's
 * <h1> has to agree with it, so this catches a renamed app with a stale manifest
 * (or the other way round).
 */
const appName = async (): Promise<string> => {
  const manifest: unknown = JSON.parse(await readFile("pyre.manifest.json", "utf8"));
  const name = manifest !== null && typeof manifest === "object" && "name" in manifest ? manifest.name : null;
  if (typeof name !== "string" || name === "") throw new Error("pyre.manifest.json has no name");
  return name;
};

/** Fails the test on any console error, which is how an unhandled rejection shows up. */
const watchConsole = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

test("the home page shows the app heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(await appName());
});

test("the studio renders a preview and downloads a png", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");

  // The signed-out first screen is the whole product minus saving.
  const preview = page.getByRole("img", { name: /meme preview/ });
  await expect(preview).toBeVisible();

  const download = page.getByTestId("download");
  await expect(download).toBeDisabled();

  await page.getByRole("radio", { name: "Zoomies" }).check();
  await page.getByLabel("Top line").fill("when the chart moves");
  await page.getByLabel("Bottom line").fill("and you are just a dog");
  await page.getByRole("radio", { name: "Corners" }).check();
  await page.getByRole("radio", { name: "Tag", exact: true }).check();

  await expect(preview).toHaveAccessibleName(/when the chart moves/);
  await expect(download).toBeEnabled();

  const started = page.waitForEvent("download");
  await download.click();
  const file = await started;
  expect(file.suggestedFilename()).toMatch(/^pyredog-[a-z0-9]+\.png$/);

  expect(errors).toEqual([]);
});

/** An 8x8 violet PNG, so the upload path runs on a real image without a fixture file. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGOY2/MfK2IYWhIA02OKAUDRUTkAAAAASUVORK5CYII=",
  "base64",
);

test("an uploaded photo replaces the stock dog", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");

  await page.getByLabel("Bottom line").fill("my own dog");
  await page.getByLabel("Or your own photo").setInputFiles({ name: "rex.png", mimeType: "image/png", buffer: TINY_PNG });

  // The header chip names the current picture, and every stock radio clears.
  await expect(page.getByText("rex.png")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Pyredog" })).not.toBeChecked();
  await expect(page.getByRole("alert")).toHaveCount(0);

  const started = page.waitForEvent("download");
  await page.getByTestId("download").click();
  expect((await started).suggestedFilename()).toMatch(/\.png$/);

  // Going back to a stock dog re-checks the radio.
  await page.getByRole("radio", { name: "Loaf" }).check();
  await expect(page.getByRole("radio", { name: "Loaf" })).toBeChecked();
  expect(errors).toEqual([]);
});

test("caption ideas come back five at a time", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Caption ideas").fill("dog watching me eat toast");
  const suggest = page.getByTestId("suggest");
  await expect(suggest).toHaveText("Suggest 5 captions");
  await suggest.click();

  const ideas = page.getByTestId("ideas");
  await expect(ideas).toBeVisible();
  await expect(ideas.getByRole("button")).toHaveCount(5);

  // Picking an idea fills the bottom line by default, which is the point of the suggestions.
  await ideas.getByRole("button").first().click();
  await expect(page.getByLabel("Bottom line")).not.toHaveValue("");

  // Asking again is a regenerate, not a first ask.
  await expect(suggest).toHaveText("Suggest 5 more");
});

test("caption ideas can target the top line instead", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Top line").fill("");
  await page.getByLabel("Caption ideas").fill("dog side-eyeing the treat jar");
  await page.getByTestId("suggest").click();

  const ideas = page.getByTestId("ideas");
  await expect(ideas).toBeVisible();

  await page.getByRole("radio", { name: "Top", exact: true }).check();
  await ideas.getByRole("button").first().click();

  await expect(page.getByLabel("Top line")).not.toHaveValue("");
  await expect(page.getByLabel("Bottom line")).toHaveValue("");
});

test("saving needs a login, and the wall works signed out", async ({ page }) => {
  await page.goto("/");

  // No Pyre session locally, so the studio offers a login instead of a save button.
  await expect(page.getByRole("button", { name: "Log in to save" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save to gallery" })).toHaveCount(0);

  await expect(page.getByTestId("wall-empty")).toBeVisible();
  await expect(page.getByText("holder perks unlock at")).toBeVisible();
});

test("holder-only frames and voices stay locked without the coin", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/legendary frames — aurora and crest — unlock at/)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Aurora" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Noir" })).toHaveCount(0);
});

test("an unreadable upload shows an error and can be retried with the same file", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");

  const notAnImage = { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a picture") };
  const upload = page.getByLabel("Or your own photo");
  await upload.setInputFiles(notAnImage);

  await expect(page.getByRole("alert")).toHaveText(/could not be read as an image/);
  // The stock picture stays selected; a bad upload never replaces the preview.
  await expect(page.getByRole("radio", { name: "Pyredog" })).toBeChecked();

  // Retrying the exact same rejected file must fire another change event, not a no-op.
  await upload.setInputFiles(notAnImage);
  await expect(page.getByRole("alert")).toHaveText(/could not be read as an image/);

  expect(errors).toEqual([]);
});

test("pressing enter in the caption field suggests ideas without a click", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Caption ideas").fill("dog negotiating with the vacuum");
  await page.getByLabel("Caption ideas").press("Enter");

  const ideas = page.getByTestId("ideas");
  await expect(ideas).toBeVisible();
  await expect(ideas.getByRole("button")).toHaveCount(5);
});

test("server functions that need a login reject anonymous calls the same way", async ({ request }) => {
  for (const name of ["save-meme", "gallery-list", "delete-meme"]) {
    const res = await request.post(`/_pyre/fn/${name}`, { data: {} });
    expect(res.ok()).toBe(true);
    expect((await res.json()).result).toEqual({ ok: false, reason: "anon" });
  }
});

test("a holder-only voice downgrades to deadpan for an anonymous caller", async ({ request }) => {
  const res = await request.post("/_pyre/fn/captions", {
    data: { vibe: "dog stares down the vacuum cleaner", voice: "noir" },
  });
  const { result } = await res.json();
  expect(result.voice).toBe("deadpan");
  expect(result.downgraded).toBe(true);
  expect(result.captions).toHaveLength(5);
});

test("the wall-list function answers with an items array with no session at all", async ({ request }) => {
  const res = await request.post("/_pyre/fn/wall-list", { data: {} });
  const { result } = await res.json();
  expect(Array.isArray(result.items)).toBe(true);
});

test("the gallery has its own signed-out prompt, separate from the studio's", async ({ page }) => {
  await page.goto("/");
  const galleryCard = page.locator("section", { has: page.getByRole("heading", { name: "Your gallery" }) });

  await expect(page.getByRole("button", { name: "Log in to save" })).toBeVisible();
  await expect(galleryCard.getByRole("button", { name: "Log in", exact: true })).toBeVisible();
  await expect(galleryCard.getByText("memes you save are tied to your login and stay yours.")).toBeVisible();
});
