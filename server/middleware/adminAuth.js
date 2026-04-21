import { logger } from "../utils/logger.js";

const normalizePhone = (phone = "") => {
  return String(phone).trim();
};

const getAdminPhones = () => {
  return String(process.env.ADMIN_PHONES || "")
    .split(",")
    .map((phone) => normalizePhone(phone))
    .filter(Boolean);
};

export const requireAdmin = (request, response, next) => {
  const adminPhones = getAdminPhones();
  const currentPhone = normalizePhone(request.user?.phone);

  if (!currentPhone || !adminPhones.includes(currentPhone)) {
    logger.warn("Admin access denied", {
      phone: currentPhone || "unknown"
    });
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
};
