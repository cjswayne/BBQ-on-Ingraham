import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

import { applySpecialEventShell, getSpecialEventShell } from "../utils/specialEventShell.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexHtml = fs.readFileSync(path.resolve(__dirname, "../../client/index.html"), "utf8");

describe("special event page shell", () => {
  it("only matches special event paths", () => {
    expect(getSpecialEventShell("/thanksgiving")).not.toBeNull();
    expect(getSpecialEventShell("/Thanksgiving/")).not.toBeNull();
    expect(getSpecialEventShell("/")).toBeNull();
    expect(getSpecialEventShell("/gallery")).toBeNull();
  });

  it("swaps the title, description, preview tags and splash for Thanksgiving", () => {
    const html = applySpecialEventShell(indexHtml, getSpecialEventShell("/thanksgiving"));

    expect(html).toContain("<title>Thanksgiving on Ingraham</title>");
    expect(html).toContain('<meta property="og:title" content="Thanksgiving on Ingraham" />');
    expect(html).toMatch(/name="description"\s+content="Thanksgiving on Ingraham, Thursday Nov 26/);
    expect(html).toContain("RSVP for Thanksgiving");
    expect(html).not.toContain("Apartment Potluck");
    expect(html).not.toContain("Vote for this week");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('src="/src/main.jsx"');
  });
});
