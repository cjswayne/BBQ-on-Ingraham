/**
 * Page shells for special event pages. The site serves one index.html, which
 * carries the Monday BBQ title, description and loading splash. For a special
 * event page we swap those for the event's own, so the first paint and link
 * previews (texts, social posts) match the page people were sent to.
 */

const SHELLS = {
  "/thanksgiving": {
    title: "Thanksgiving on Ingraham",
    description:
      "Thanksgiving on Ingraham, Thursday Nov 26 at 5pm. A neighborhood potluck, then the Chiefs v Bills game together. Bring a dish and RSVP.",
    skeleton: `<div id="hero-skeleton" class="hero-skel">
      <div class="hero-skel-bg" style="background:linear-gradient(to bottom right,#4A2E1B,#8C2F1C)"></div>
      <div class="hero-skel-content">
        <p class="hero-skel-sub">A special holiday potluck</p>
        <h1 class="hero-skel-h1">Thanksgiving on Ingraham</h1>
        <p class="hero-skel-desc">Thursday, November 26 at 5pm. Chiefs v Bills watch party after dinner.</p>
        <p class="hero-skel-desc">4262 Ingraham St, San Diego, CA 92109</p>
        <div class="hero-skel-actions">
          <a class="hero-skel-cta" href="#rsvp" style="background:#C2571A">RSVP for Thanksgiving</a>
        </div>
      </div>
    </div>`
  }
};

const escapeAttribute = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * Finds the shell for a request path, ignoring a trailing slash and case.
 * @param {string} requestPath - Express request path.
 * @returns {object|null} Shell config, or null for ordinary pages.
 */
export const getSpecialEventShell = (requestPath = "") => {
  const normalized = String(requestPath).toLowerCase().replace(/\/+$/, "");
  return SHELLS[normalized] || null;
};

/**
 * Rewrites the built index.html for a special event page.
 * @param {string} html - Contents of client/dist/index.html.
 * @param {object} shell - Shell config from getSpecialEventShell.
 * @returns {string} HTML with the event's title, description, preview tags and splash.
 */
export const applySpecialEventShell = (html, shell) => {
  const description = escapeAttribute(shell.description);
  const title = escapeAttribute(shell.title);
  const previewTags = [
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary" />`
  ].join("\n    ");

  let output = html
    .replace(/<title>[^<]*<\/title>/, `<title>${shell.title}</title>\n    ${previewTags}`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${description}$2`);

  const start = output.indexOf('<div id="hero-skeleton"');
  const end = output.indexOf('<div id="root"');
  if (start !== -1 && end > start) {
    output = `${output.slice(0, start)}${shell.skeleton}\n    ${output.slice(end)}`;
  }

  return output;
};
