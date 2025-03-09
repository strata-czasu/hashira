ARG BUN_VERSION=1.2.0

FROM oven/bun:${BUN_VERSION}-slim AS base

RUN apt-get update \
    && apt-get -y install --no-install-recommends ca-certificates wget unzip fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://www.1001fonts.com/download/now.zip \
    && unzip -d now/ now.zip \
    && mkdir -p /usr/share/fonts/opentype/ \
    && cp -r $PWD/now/ /usr/share/fonts/opentype/ \
    && rm -f now.zip \
    && rm -rf $PWD/now/ \
    && fc-cache -f -v

WORKDIR /app

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

USER bun
CMD ["bun", "start:prod"]
