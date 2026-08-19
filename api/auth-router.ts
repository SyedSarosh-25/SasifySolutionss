import * as cookie from "cookie";
import { z } from "zod";
import mongoose from "mongoose";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { connectDb } from "./queries/connection";
import { getSessionCookieOptions } from "./lib/cookies";
import { hashPassword, verifyPassword } from "./lib/password";
import { signSessionToken } from "./kimi/session";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { findUserByEmail } from "./queries/users";
import type { User } from "@db/schema";
import { User as UserModel, nextId } from "./mongo/models";
import { bindReferralAtRegistration, resolveReferralCode } from "./services/referral";

function toSessionUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    providerStatus: user.providerStatus,
    walletBalance: user.walletBalance,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastSignInAt: user.lastSignInAt,
  };
}

function setSessionCookie(ctx: { req: Request; resHeaders: Headers }, token: string) {
  const opts = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );
}

const loginInput = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const registerInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  referralCode: z.string().trim().min(4).max(40).optional(),
});

export const authRouter = createRouter({
  login: publicQuery.input(loginInput).mutation(async ({ ctx, input }) => {
    const user = await findUserByEmail(input.email);
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password.",
      });
    }
    if (!verifyPassword(input.password, user.passwordHash)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password.",
      });
    }

    const token = await signSessionToken({ userId: user.id });
    setSessionCookie(ctx, token);

    await connectDb();
    await UserModel.updateOne({ id: user.id }, { $set: { lastSignInAt: new Date() } });

    return toSessionUser(user);
  }),
  register: publicQuery.input(registerInput).mutation(async ({ ctx, input }) => {
    const existing = await findUserByEmail(input.email);
    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Account already exists. Please login.",
      });
    }

    if (input.referralCode) {
      await connectDb();
      const profile = await resolveReferralCode(input.referralCode);
      if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "Referral code is invalid or expired" });
      const referrer = await UserModel.findOne({ id: profile.userId }).select("email").lean<{ email?: string }>();
      if (referrer?.email?.toLowerCase() === input.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Self-referral is not allowed" });
      }
    }

    const userId = await nextId("users");
    await connectDb();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await UserModel.create([{
          id: userId,
          name: input.name,
          email: input.email,
          passwordHash: hashPassword(input.password),
          role: "user",
          lastSignInAt: new Date(),
        }], { session });
        if (input.referralCode) {
          await bindReferralAtRegistration({ referredUserId: userId, referredEmail: input.email, code: input.referralCode, session });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("duplicate")) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Account already exists. Please login.",
        });
      }
      throw error;
    } finally {
      await session.endSession();
    }

    const user = await findUserByEmail(input.email);
    if (!user) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Account created but could not be loaded.",
      });
    }


    const token = await signSessionToken({ userId: user.id });
    setSessionCookie(ctx, token);
    return toSessionUser(user);
  }),
  updateProfile: authedQuery
    .input(z.object({ name: z.string().trim().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      await connectDb();
      const updated = await UserModel.findOneAndUpdate({ id: ctx.user.id }, { $set: { name: input.name } }, { returnDocument: "after" }).lean<User>();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return toSessionUser(updated);
    }),
  me: authedQuery.query((opts) => toSessionUser(opts.ctx.user)),
  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
