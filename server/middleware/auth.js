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

export const createJwtToken = (payload) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
};

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
      phone: decodedToken.phone
    };
    next();
  } catch (error) {
    logger.error("JWT verification failed", error);
    respondUnauthorized(response, "Invalid or expired token");
  }
};

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
      phone: decodedToken.phone
    };
  } catch (error) {
    logger.error("Optional JWT verification failed", error);
    request.user = null;
  }

  next();
};
