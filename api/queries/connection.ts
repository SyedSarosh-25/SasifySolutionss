import mongoose from "mongoose";
import { env } from "../lib/env";
import "../mongo/models";

let connection: Promise<typeof mongoose> | null = null;

export function getDb() {
  if (!connection) {
    connection = mongoose.connect(env.databaseUrl, {
      serverSelectionTimeoutMS: 10000,
    });
  }
  return connection;
}

export async function connectDb() {
  return getDb();
}
