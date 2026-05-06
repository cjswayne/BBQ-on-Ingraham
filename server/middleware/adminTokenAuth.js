import jwt from "jsonwebtoken";

import { logger } from "../utils/logger.js";

const jwtSecret = process.env.JWT_SECRET || "development-secret";

const getAdminPhones = () => {
  return String(process.env.ADMIN_PHONES || "")
    .split(",")
    .map((phone) => phone.trim())
    .filter(Boolean);
};

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

// Accepts either a password-based admin JWT or a phone JWT where the phone is in ADMIN_PHONES
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

    const phone = String(decoded.phone || "").trim();
    const adminPhones = getAdminPhones();

    if (phone && adminPhones.includes(phone)) {
      request.user = { userId: decoded.userId, phone };
      next();
      return;
    }

    logger.warn("Admin access denied via token", { phone: phone || "none" });
    response.status(403).json({ error: "Admin access required" });
  } catch (error) {
    logger.error("Admin token verification failed", error);
    response.status(401).json({ error: "Invalid or expired token" });
  }
};
