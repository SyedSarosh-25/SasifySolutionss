import { authRouter } from "./auth-router";
import { publicRouter } from "./routers/public";
import { walletRouter } from "./routers/wallet";
import { orderRouter } from "./routers/order";
import { supportRouter } from "./routers/support";
import { providerRouter } from "./routers/provider";
import { adminRouter } from "./routers/admin";
import { dashboardRouter } from "./routers/dashboard";
import { requestRouter } from "./routers/requests";
import { scammersRouter } from "./routers/scammers";
import { thirdPartyRouter } from "./routers/third-party";
import { providerSettingsRouter } from "./routers/provider-settings";
import { siteBuilderRouter } from "./routers/site-builder";
import { siteThemeRouter } from "./routers/site-theme";
import { referralRouter } from "./routers/referral";
import { referralAdminRouter } from "./routers/referral-admin";
import { binancePayRouter } from "./routers/binance-pay";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  public: publicRouter,
  wallet: walletRouter,
  order: orderRouter,
  support: supportRouter,
  provider: providerRouter,
  admin: adminRouter,
  dashboard: dashboardRouter,
  requests: requestRouter,
  scammers: scammersRouter,
  thirdParty: thirdPartyRouter,
  providerSettings: providerSettingsRouter,
  siteBuilder: siteBuilderRouter,
  siteTheme: siteThemeRouter,
  referral: referralRouter,
  referralAdmin: referralAdminRouter,
  binancePay: binancePayRouter,
});

export type AppRouter = typeof appRouter;
