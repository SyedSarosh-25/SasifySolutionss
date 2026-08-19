import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "../middleware";
import { connectDb } from "../queries/connection";
import { ToolRequest, clean, nextId } from "../mongo/models";

const screenshotSchema = z
  .string()
  .startsWith("data:image/")
  .max(2_750_000)
  .optional();

export const requestRouter = createRouter({
  create: publicQuery
    .input(z.object({
      requesterName: z.string().trim().min(2).max(120),
      requesterEmail: z.string().email().transform((value) => value.toLowerCase()),
      requestType: z.enum(["tool", "service"]),
      itemName: z.string().trim().min(2).max(160),
      desiredPlan: z.string().trim().min(2).max(160),
      budget: z.string().trim().min(1).max(120),
      screenshotDataUrl: screenshotSchema,
      notes: z.string().trim().max(1000).optional(),
    }))
    .mutation(async ({ input }) => {
      await connectDb();
      if (input.screenshotDataUrl && !/^data:image\/(png|jpe?g|webp);base64,/i.test(input.screenshotDataUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Screenshot must be a PNG, JPG, or WebP image" });
      }

      const request = await ToolRequest.create({
        id: await nextId("tool_requests"),
        ...input,
        status: "new",
      });

      return {
        id: request.id,
        request: clean(request),
      };
    }),
});
