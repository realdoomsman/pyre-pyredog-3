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
  await page.getByTestId("suggest").click();

  const ideas = page.getByTestId("ideas");
  await expect(ideas).toBeVisible();
  await expect(ideas.getByRole("button")).toHaveCount(5);

  // Picking an idea fills the bottom line, which is the point of the suggestions.
  await ideas.getByRole("button").first().click();
  await expect(page.getByLabel("Bottom line")).not.toHaveValue("");
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
