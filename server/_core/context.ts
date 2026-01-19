import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // User authentication is handled by adminProcedure middleware in routers.ts
  // No need for global authentication here since we use local admin login
  return {
    req: opts.req,
    res: opts.res,
    user: null,
  };
}
