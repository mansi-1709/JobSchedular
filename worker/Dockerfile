FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configs
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Copy worker source
COPY worker ./worker

# Install dependencies
RUN npm install

# Build worker
WORKDIR /app/worker
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/worker/dist ./worker/dist
COPY --from=builder /app/worker/package.json ./worker/package.json

WORKDIR /app/worker

ENV NODE_ENV=production

# Start worker
CMD ["node", "dist/index.js"]
