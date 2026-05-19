import { logger } from "../utils/logger.js";

/**
 * Restricts access to requests authenticated with admin password auth.
 * @param {import("express").Request} request - The incoming request object.
 * @param {import("express").Response} response - The outgoing response object.
 * @param {import("express").NextFunction} next - The next middleware callback.
 * @returns {void}
 */
export const requireAdmin = (request, response, next) => {
  if (request.adminPasswordAuth !== true) {
    logger.warn("Admin access denied", {
      adminPasswordAuth: request.adminPasswordAuth === true
    });
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
};
