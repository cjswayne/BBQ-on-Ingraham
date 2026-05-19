import jwt from "jsonwebtoken";

import { logger } from "../utils/logger.js";

const jwtSecret = process.env.JWT_SECRET || "development-secret";

const getBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

// Creates a short-lived JWT for password-based admin sessions
export const createAdminToken = () => {
  return jwt.sign({ adminPasswordAuth: true }, jwtSecret, { expiresIn: "8h" });
};

/**
 * Ensures the request has an admin JWT with password-based admin auth.
 * @param {import("express").Request} request - The incoming request object.
 * @param {import("express").Response} response - The outgoing response object.
 * @param {import("express").NextFunction} next - The next middleware callback.
 * @returns {void}
 */
export const requireAdminAccess = (request, response, next) => {
  const token = getBearerToken(request.headers.authorization);

  if (!token) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.adminPasswordAuth === true) {
      request.adminPasswordAuth = true;
      next();
      return;
    }

    logger.warn("Admin access denied via token", {
      adminPasswordAuth: decoded.adminPasswordAuth === true
    });
    response.status(403).json({ error: "Admin access required" });
  } catch (error) {
    logger.error("Admin token verification failed", error);
    response.status(401).json({ error: "Invalid or expired token" });
  }
};
