ARG BUN_VERSION=1.3.4

FROM oven/bun:${BUN_VERSION}-slim AS build

RUN apt-get update \
    && apt-get -y install --no-install-recommends openssl fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY fonts/ /usr/local/share/fonts/
RUN fc-cache -f -v

WORKDIR /app

COPY --link bun.lock package.json ./
COPY --link apps/bot/package.json apps/bot/package.json
COPY --link packages/core/package.json packages/core/package.json
COPY --link packages/db/package.json packages/db/package.json
COPY --link packages/env/package.json packages/env/package.json
COPY --link packages/paginate/package.json packages/paginate/package.json
COPY --link packages/utils/package.json packages/utils/package.json
COPY --link packages/yotei/package.json packages/yotei/package.json
COPY --link tooling/tsconfig/package.json tooling/tsconfig/package.json

RUN bun install

COPY --link . .

RUN bun prisma-generate

RUN bun build \
    --compile \
    --minify-whitespace \
    --minify-syntax \
    --target bun \
    --outfile hashira \
    apps/bot/src/index.ts

FROM gcr.io/distroless/cc

WORKDIR /app

COPY --from=build /app/hashira hashira
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma

# TODO)): we should copy migrations and run it with a custom script? but we're stuck with `sharp` needing .node files and compile doesn't bundle them

CMD ["./hashira"]
