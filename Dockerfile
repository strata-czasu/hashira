ARG BUN_VERSION=1.2.0

FROM oven/bun:${BUN_VERSION}-slim AS base

RUN apt-get update \
    && apt-get -y install --no-install-recommends fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY fonts/ /usr/local/share/fonts/
RUN fc-cache -f -v

WORKDIR /app

COPY --link bun.lockb package.json ./
COPY --link apps/bot/package.json apps/bot/package.json
COPY --link packages/core/package.json packages/core/package.json
COPY --link packages/db/package.json packages/db/package.json
COPY --link packages/paginate/package.json packages/paginate/package.json
COPY --link packages/utils/package.json packages/utils/package.json
COPY --link packages/env/package.json packages/env/package.json
COPY --link tooling/tsconfig/package.json tooling/tsconfig/package.json

RUN bun install --production

COPY --link . .

RUN bun prisma-generate

USER bun
CMD ["bun", "start:prod"]
