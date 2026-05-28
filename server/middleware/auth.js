import jwt from "jsonwebtoken";

import { logger } from "../utils/logger.js";

const jwtSecret = process.env.JWT_SECRET || "development-secret";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "24h";

const getBearerToken = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

const verifyToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

const respondUnauthorized = (response, message) => {
  response.status(401).json({ error: message });
};

/**
 * Creates a signed JWT from a user identity payload.
 * @param {{userId: string, email?: string, phone?: string}} payload - User identity values for token claims.
 * @returns {string} Signed JWT token.
 */
export const createJwtToken = ({ userId, email, phone }) => {
  const claims = { userId };
  if (email) claims.email = email;
  if (phone) claims.phone = phone;
  return jwt.sign(claims, jwtSecret, { expiresIn: jwtExpiresIn });
};

/**
 * Requires a valid auth token and assigns user identity to the request.
 * @param {import("express").Request} request - Incoming request object.
 * @param {import("express").Response} response - Outgoing response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {void}
 */
export const requireAuth = (request, response, next) => {
  const token = getBearerToken(request.headers.authorization);

  if (!token) {
    respondUnauthorized(response, "Authentication required");
    return;
  }

  try {
    const decodedToken = verifyToken(token);

    request.user = {
      userId: decodedToken.userId,
      email: decodedToken.email || null,
      phone: decodedToken.phone || null
    };
    next();
  } catch (error) {
    logger.error("JWT verification failed", error);
    respondUnauthorized(response, "Invalid or expired token");
  }
};

/**
 * Optionally attaches user identity to the request when a valid token exists.
 * @param {import("express").Request} request - Incoming request object.
 * @param {import("express").Response} _response - Unused response object.
 * @param {import("express").NextFunction} next - Express next middleware function.
 * @returns {void}
 */
export const optionalAuth = (request, _response, next) => {
  const token = getBearerToken(request.headers.authorization);

  if (!token) {
    request.user = null;
    next();
    return;
  }

  try {
    const decodedToken = verifyToken(token);

    request.user = {
      userId: decodedToken.userId,
      email: decodedToken.email || null,
      phone: decodedToken.phone || null
    };
  } catch (error) {
    logger.error("Optional JWT verification failed", error);
    request.user = null;
  }

  next();
};
