FROM node:20-slim AS build

ARG BUN_VERSION=bun-v1.1.27
ENV BUN_INSTALL=/usr/local

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl ca-certificates unzip \
    && curl -fsSL https://bun.sh/install | bash -s "${BUN_VERSION}"

WORKDIR /app

COPY bun.lockb package.json ./
COPY apps/bot/package.json apps/bot/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/paginate/package.json packages/paginate/package.json
COPY packages/env/package.json packages/env/package.json
COPY tooling/tsconfig/package.json tooling/tsconfig/package.json

RUN bun install

COPY . .

RUN bun prisma-generate

RUN bun compile

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 libstdc++6 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/hashira/dist/hashira /usr/local/bin/hashira

CMD ["hashira"]
