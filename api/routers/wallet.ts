import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { Deposit, SiteSetting, User, WalletTransaction, cleanMany, nextId } from "../mongo/models";
import { sendDepositNotification } from "../services/email";
import { creditMatchingNayaPayDeposit } from "../services/nayapay";
import { parseUsdToPkrRate } from "../lib/third-party-pricing";
import { canonicalDepositUsd } from "../lib/deposit-money";
import { runInTransaction } from "../services/wallet-ledger";
import { reservePaymentReference } from "../services/payment-reference";

const screenshotSchema = z
  .string()
  .max(3_500_000, "Screenshot file is too large")
  .optional();

export const walletRouter = createRouter({
  balance: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    const user = await User.findOne({ id: ctx.user.id }).lean<{ walletBalance?: string }>();
    return { balance: user?.walletBalance ?? "0" };
  }),

  transactions: authedQuery
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      await connectDb();
      return cleanMany(await WalletTransaction.find({ userId: ctx.user.id })
        .sort({ createdAt: -1 })
        .skip(input?.offset ?? 0)
        .limit(input?.limit ?? 20)
        .lean());
    }),

  depositCreate: authedQuery
    .input(z.object({
      method: z.enum(["usdt_trc20", "usdt_bep20", "easypaisa", "nayapay", "jazzcash", "binance_pay"]),
      amount: z.number().positive(),
      submittedAmount: z.number().positive().optional(),
      submittedCurrency: z.enum(["USD", "PKR"]).optional(),
      txid: z.string().min(4, "TRX ID is required"),
      screenshotUrl: screenshotSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const txid = input.txid?.trim();
      const screenshotUrl = input.screenshotUrl?.trim();

      if (!txid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "TRX ID is required after payment" });
      }
      if (input.method !== "nayapay" && (!screenshotUrl || !/^data:image\/(png|jpe?g|webp);base64,/i.test(screenshotUrl))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment screenshot is required" });
      }
      if (input.method === "nayapay" && screenshotUrl && !/^data:image\/(png|jpe?g|webp);base64,/i.test(screenshotUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment screenshot must be a PNG, JPG, or WebP image" });
      }
      const isLocalWallet = ["easypaisa", "nayapay", "jazzcash"].includes(input.method);
      if (input.submittedAmount == null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Submitted payment amount is required" });
      }
      const submittedAmount = input.submittedAmount;
      if (isLocalWallet && input.submittedCurrency !== "PKR") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Local wallet deposit amount must be submitted in PKR" });
      }
      if (!isLocalWallet && input.submittedCurrency !== "USD") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "International deposit amount must be submitted in USD" });
      }
      const rateSetting = isLocalWallet
        ? await SiteSetting.findOne({ key: "usd_to_pkr" }).select("value").lean<{ value?: string }>()
        : null;
      const conversionRate = isLocalWallet ? parseUsdToPkrRate(rateSetting?.value) : 1;
      const canonicalUsd = canonicalDepositUsd(submittedAmount, input.submittedCurrency!, conversionRate);
      if (input.method !== "nayapay" && canonicalUsd < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Deposit amount must be at least $1" });
      }
      if (txid) {
        const existing = await Deposit.findOne({ txid }).lean();
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "This transaction hash has already been used" });
        }
      }

      const depositId = await nextId("deposits");
      let deposit: any;
      try {
        deposit = await runInTransaction(async (session) => {
          await reservePaymentReference({ session, reference: txid, sourceType: "deposit", sourceId: depositId, userId: ctx.user.id, paymentMethod: input.method });
          const [created] = await Deposit.create([{
            id: depositId,
            userId: ctx.user.id,
            method: input.method,
            amount: canonicalUsd.toFixed(2),
            submittedAmount: submittedAmount.toFixed(2),
            submittedCurrency: input.submittedCurrency,
            conversionRate: conversionRate.toFixed(4),
            txid,
            screenshotUrl,
            status: "pending",
          }], { session });
          return created;
        });
      } catch (error: any) {
        if (error?.code === 11000) throw new TRPCError({ code: "CONFLICT", message: "This transaction hash has already been used" });
        throw error;
      }

      const user = await User.findOne({ id: ctx.user.id }).select("name email").lean<{ name?: string; email?: string }>();
      try {
        await sendDepositNotification({
          depositId: deposit.id,
          customerName: user?.name,
          customerEmail: user?.email,
          method: input.method,
          amount: canonicalUsd.toFixed(2),
          submittedAmount: submittedAmount.toFixed(2),
          submittedCurrency: input.submittedCurrency,
          txid,
          hasScreenshot: Boolean(screenshotUrl),
        });
      } catch (error) {
        console.error("Failed to send deposit email notification", error);
      }

      if (input.method === "nayapay") {
        const credit = await creditMatchingNayaPayDeposit(txid);
        if (credit.credited) {
          return { id: deposit.id, message: "NayaPay payment verified and wallet credited automatically" };
        }
      }

      return { id: deposit.id, message: "Deposit request created successfully" };
    }),

  depositList: authedQuery.query(async ({ ctx }) => {
    await connectDb();
    return cleanMany(await Deposit.find({ userId: ctx.user.id }).sort({ createdAt: -1 }).lean());
  }),
});
