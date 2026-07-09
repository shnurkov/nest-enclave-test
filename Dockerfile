
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# Production
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# enclaver run has no flag to pass env vars into the enclave, so AWS_REGION
# must be baked into this image before `enclaver build` wraps it into an EIF.
ARG AWS_REGION
ENV NODE_ENV=production
ENV AWS_REGION=${AWS_REGION}
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

EXPOSE 4545
CMD ["node", "/app/dist/main.js"]