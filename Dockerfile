# Use Node.js 24 slim image
FROM node:24-slim

# Enable corepack for pnpm
RUN corepack enable

# Install curl for healthchecks
RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build the application
RUN pnpm build

# Create symlink for backward compatibility with TimeWeb's auto-detection
RUN mkdir -p dist/server && ln -sf ../index.js dist/server/index.js

# Expose port
EXPOSE 3000

# Start command - both paths work now!
CMD ["node", "dist/index.js"]
