import cron from "node-cron";

import { Event } from "../models/Event.js";
import { ThemePollOption } from "../models/ThemePollOption.js";
import { getNextMonday } from "../utils/dateUtils.js";
import { logger } from "../utils/logger.js";

// Picks one item at random from an array
const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

// Selects the highest-voted theme for the next event and saves it.
// If no options exist, picks nothing. Ties are broken randomly.
// Skips if the event already has a theme set.
export const autoPickTheme = async () => {
  try {
    const eventDate = getNextMonday();
    const event = await Event.findOne({ date: eventDate });

    if (!event) {
      logger.info("themeScheduler: no upcoming event found, skipping");
      return;
    }

    if (event.theme) {
      logger.info("themeScheduler: theme already set, skipping", { theme: event.theme });
      return;
    }

    const options = await ThemePollOption.find({ eventId: event._id });

    if (!options.length) {
      logger.info("themeScheduler: no poll options available, skipping");
      return;
    }

    const maxVotes = Math.max(...options.map((o) => o.voteCount));
    // Include all options tied at the top vote count (includes 0-vote ties)
    const topOptions = options.filter((o) => o.voteCount === maxVotes);
    const chosen = pickRandom(topOptions);

    await Event.findByIdAndUpdate(event._id, {
      theme: chosen.suggestion,
      themePollActive: false
    });

    logger.info("themeScheduler: auto-picked theme", {
      theme: chosen.suggestion,
      voteCount: chosen.voteCount,
      tiedCount: topOptions.length
    });
  } catch (error) {
    logger.error("themeScheduler: failed to auto-pick theme", error);
  }
};

// Runs every Saturday at 11pm Pacific time
export const startThemeScheduler = () => {
  cron.schedule("0 23 * * 6", autoPickTheme, {
    timezone: "America/Los_Angeles"
  });

  logger.info("themeScheduler: registered Saturday 11pm Pacific auto-pick");
};
