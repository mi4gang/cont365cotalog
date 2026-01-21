import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
// import { initDatabase } from "../initDatabase"; // Disabled: use manual SQL script instead

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Database initialization disabled - use init-production-mysql.sql script in phpMyAdmin instead
  // await initDatabase();
  
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Serve uploaded files from /uploads directory
  app.use("/uploads", express.static("uploads"));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  
  // In production, use PORT directly; in development, find available port
  const finalPort = process.env.NODE_ENV === "production" 
    ? port 
    : await findAvailablePort(port);

  if (finalPort !== port && process.env.NODE_ENV !== "production") {
    console.log(`Port ${port} is busy, using port ${finalPort} instead`);
  }

  // Listen on 0.0.0.0 in all modes (required by Manus proxy and TimeWeb/Docker)
  const host = "0.0.0.0";
  
  server.listen(finalPort, host, () => {
    console.log(`Server is running on port ${finalPort}`);
    console.log(`Server running on http://${host}:${finalPort}/`);
  });
}

startServer().catch(console.error);
