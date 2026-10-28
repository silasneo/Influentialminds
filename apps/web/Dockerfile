# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
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
# NEXT_PUBLIC_* values are inlined at build time, so the browser-facing origins
# have to be known here rather than at container start.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
  NEXT_TELEMETRY_DISABLED=1
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN pnpm --filter @influential-minds/contracts build \
  && pnpm --filter @influential-minds/web build

FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /repo/packages/contracts ./packages/contracts
COPY --from=build /repo/apps/web ./apps/web
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "--port", "3000", "--hostname", "0.0.0.0"]
