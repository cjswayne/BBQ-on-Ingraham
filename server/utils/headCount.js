import { RSVP } from "../models/RSVP.js";

export const MAX_HEAD_COUNT = 20;

// Sums guestCount across active RSVPs for an event, optionally skipping one RSVP
export const getHeadCount = async (eventId, { excludeRsvpId = null } = {}) => {
  const match = { eventId, cancelledAt: null };

  if (excludeRsvpId) {
    match._id = { $ne: excludeRsvpId };
  }

  const [result] = await RSVP.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$guestCount" } } }
  ]);

  return result?.total ?? 0;
};

// Returns true when adding guestCount people would go over the weekly cap
export const exceedsHeadCount = async (eventId, guestCount, options) => {
  const current = await getHeadCount(eventId, options);

  return current + guestCount > MAX_HEAD_COUNT;
};
