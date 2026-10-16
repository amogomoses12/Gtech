import { createServer } from "vite";
import { createApp } from "../server/index.mjs";
import { config } from "../server/config.mjs";
import { db } from "../server/db.mjs";

const api = createApp().listen(config.port, "0.0.0.0", () =>
  console.log(`Gtech database API listening on ${config.port}`),
);
const vite = await createServer({
  server: {
    host: "0.0.0.0",
    port: Number(process.env.FRONTEND_PORT || 5173),
    proxy: { "/api": `http://127.0.0.1:${config.port}` },
  },
});
await vite.listen();
vite.printUrls();
console.log("First time? Run npm run admin:create in another terminal.");
const close = async () => {
  await vite.close();
  api.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
