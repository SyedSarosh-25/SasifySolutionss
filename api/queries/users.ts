import type { InsertUser, User as UserType } from "@db/schema";
import { connectDb } from "./connection";
import { User, clean, nextId } from "../mongo/models";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  await connectDb();
  return clean(await User.findOne({ unionId }));
}

export async function findUserById(id: number) {
  await connectDb();
  return clean(await User.findOne({ id }));
}

export async function findUserByEmail(email: string) {
  await connectDb();
  return clean(await User.findOne({ email: email.toLowerCase() }));
}

export async function upsertUser(data: InsertUser) {
  await connectDb();
  const values = { ...data } as Partial<UserType>;
  const updateSet: Partial<UserType> = {
    lastSignInAt: new Date(),
    ...values,
  };

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  const existing = values.unionId
    ? await User.findOne({ unionId: values.unionId })
    : values.email
      ? await User.findOne({ email: values.email })
      : null;

  if (existing) {
    await User.updateOne({ id: existing.id }, { $set: updateSet });
    return;
  }

  await User.create({
    ...values,
    id: await nextId("users"),
  });
}
