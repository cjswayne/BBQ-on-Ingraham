// One-off events that live on their own page (e.g. /thanksgiving) instead of
// the weekly Monday BBQ. Each one gets its own Event document, keyed by slug,
// so its RSVPs stay separate from the regular Monday RSVPs.
export const SPECIAL_EVENTS = {
  thanksgiving: {
    slug: "thanksgiving",
    title: "Thanksgiving on Ingraham",
    year: 2026,
    month: 11,
    day: 26,
    timeLabel: "5pm"
  }
};

export const getSpecialEventConfig = (slug) => {
  if (!slug) {
    return null;
  }

  return SPECIAL_EVENTS[String(slug).trim().toLowerCase()] || null;
};
