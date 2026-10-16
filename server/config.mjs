import "dotenv/config";
import path from "node:path";

export const production = process.env.NODE_ENV === "production";
export const config = {
  port: Number(process.env.PORT || 3001),
  publicUrl: (process.env.PUBLIC_URL || "http://localhost:5173").replace(
    /\/$/,
    "",
  ),
  database: path.resolve(process.env.DATABASE_PATH || "storage/gtech.sqlite"),
  uploads: path.resolve(process.env.UPLOAD_DIR || "storage/uploads"),
  maxUpload:
    Math.min(1024, Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 250)) *
    1024 *
    1024,
  devPayments: !production && process.env.ENABLE_DEV_CHECKOUT !== "false",
  stripeSecret: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET || "",
  secureCookie: production,
};
if (production && !config.publicUrl.startsWith("https://")) {
  throw new Error(
    "Production requires PUBLIC_URL to be your public HTTPS address.",
  );
}
if (production && config.stripeSecret && !config.stripeWebhook) {
  throw new Error(
    "Set STRIPE_WEBHOOK_SECRET before enabling production payments.",
  );
}
