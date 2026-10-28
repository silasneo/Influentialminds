# syntax=docker/dockerfile:1

# Debian rather than Alpine: Prisma's query engine wants glibc and OpenSSL.
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @influential-minds/contracts build \
  && pnpm --filter @influential-minds/api prisma:generate \
  && pnpm --filter @influential-minds/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /repo/packages/contracts ./packages/contracts
COPY --from=build /repo/apps/api ./apps/api
WORKDIR /repo/apps/api
RUN mkdir -p storage
EXPOSE 4000
CMD ["node", "dist/main.js"]
