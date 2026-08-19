import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { verifySessionToken } from "./session";
import { findUserById, findUserByUnionId } from "../queries/users";

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw Errors.forbidden("Invalid authentication token.");
  }

  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }

  const user = claim.userId
    ? await findUserById(claim.userId)
    : claim.unionId
      ? await findUserByUnionId(claim.unionId)
      : undefined;

  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }

  return user;
}
