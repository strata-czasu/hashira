ARG BUN_VERSION=1.2.19
ARG APP=bot

FROM oven/bun:${BUN_VERSION}-slim AS base

RUN apt-get update \
    && apt-get -y install --no-install-recommends openssl fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY fonts/ /usr/local/share/fonts/
RUN fc-cache -f -v

WORKDIR /app

COPY --link bun.lock package.json ./
COPY --link apps/bot/package.json apps/bot/package.json
COPY --link apps/wordle/package.json apps/wordle/package.json
COPY --link packages/core/package.json packages/core/package.json
COPY --link packages/db/package.json packages/db/package.json
COPY --link packages/paginate/package.json packages/paginate/package.json
COPY --link packages/utils/package.json packages/utils/package.json
COPY --link packages/env/package.json packages/env/package.json
COPY --link tooling/tsconfig/package.json tooling/tsconfig/package.json

RUN bun install --production

COPY --link . .


# apps/bot
FROM base AS bot

RUN bun prisma-generate
CMD ["bun", "start:prod"]


# apps/wordle
FROM base AS wordle

WORKDIR /app/apps/wordle
RUN bun prisma-generate
RUN mkdir -p /appdata/wordle && chown -R bun:bun /appdata/wordle
CMD ["bun", "start:prod"]


# Final image
FROM ${APP} AS final

USER bun
