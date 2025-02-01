ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-slim AS base

ARG BUN_VERSION=bun-v1.2.0
ENV BUN_INSTALL=/usr/local

RUN apt-get update && \
    apt-get -y install --no-install-recommends curl ca-certificates unzip && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    curl -fsSL https://bun.sh/install | bash -s "${BUN_VERSION}"

WORKDIR /app

FROM base AS build

COPY --link bun.lockb package.json ./
COPY --link apps/bot/package.json apps/bot/package.json
COPY --link packages/core/package.json packages/core/package.json
COPY --link packages/db/package.json packages/db/package.json
COPY --link packages/paginate/package.json packages/paginate/package.json
COPY --link packages/env/package.json packages/env/package.json
COPY --link tooling/tsconfig/package.json tooling/tsconfig/package.json

RUN bun install --production

COPY --link . .

RUN bun prisma-generate

CMD ["bun", "start:prod"]
