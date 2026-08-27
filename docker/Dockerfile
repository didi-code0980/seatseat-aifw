# Multi-stage. The runtime image carries no pnpm store, no dev dependencies, and no source.
#
# Node 24 rather than the 23.6.0 on the bootstrap machine. The floor it was originally pinned for was
# Prisma 7's, and Prisma left with ADR-007; the pin stays because an even-numbered LTS line is what
# `package.json`'s `engines.node` asks for, and pinning it here means the container is correct
# regardless of what the host happens to have.

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app


FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile


FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build


FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Runs unprivileged. The node image ships a `node` user for exactly this.
USER node

COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json

EXPOSE 3000
CMD ["pnpm", "start"]
