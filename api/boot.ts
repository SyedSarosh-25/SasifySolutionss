import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { securityMiddleware } from "./lib/security";
import { binancePayRoutes } from "./routes/binance-pay";
import { easypaisaRoutes } from "./routes/easypaisa";
import { nayapayRoutes } from "./routes/nayapay";
import { startBinancePayReconciliationWorker } from "./services/binance-pay-orders";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(securityMiddleware);
app.use(bodyLimit({ maxSize: 6 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.route("/", easypaisaRoutes);
app.route("/", binancePayRoutes);
app.route("/", nayapayRoutes);
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    process.stdout.write(`Server running on http://localhost:${port}/\n`);
  });
  startBinancePayReconciliationWorker();
}
