import type mongoose from "mongoose";
import { AuditLog, clean, nextId } from "../mongo/models";

type AuditInput = {
  operationKey: string;
  actorId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  metadata?: unknown;
  ipAddress?: string;
  session?: mongoose.ClientSession;
};

export async function recordAuditOnce(input: AuditInput) {
  const payload = {
    id: await nextId("audit_logs"),
    operationKey: input.operationKey,
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    ipAddress: input.ipAddress,
  };
  try {
    return clean(await AuditLog.findOneAndUpdate(
      { operationKey: input.operationKey },
      { $setOnInsert: payload },
      { upsert: true, returnDocument: "after", session: input.session },
    ).lean());
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    return clean(await AuditLog.findOne({ operationKey: input.operationKey }).session(input.session ?? null).lean());
  }
}
