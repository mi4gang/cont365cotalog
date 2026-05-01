import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { adminContainersRouter } from "./routers/adminContainers";
import { adminAuthRouter } from "./routers/auth";
import { containersRouter } from "./routers/containers";
import { reservationsRouter } from "./routers/reservations";
import { setupRouter } from "./routers/setup";

export const appRouter = router({
  system: systemRouter,
  adminAuth: adminAuthRouter,
  containers: containersRouter,
  reservations: reservationsRouter,
  adminContainers: adminContainersRouter,
  setup: setupRouter,
});

export type AppRouter = typeof appRouter;
