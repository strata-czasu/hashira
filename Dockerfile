ARG NODE_VERSION=20

FROM mcr.microsoft.com/devcontainers/javascript-node:${NODE_VERSION} as base

ARG BUN_VERSION=bun-v1.0.29
ENV BUN_INSTALL=/usr/local

RUN apt-get update \
    && apt-get -y install --no-install-recommends git \
    && curl -fsSL https://bun.sh/install | bash -s "${BUN_VERSION}"

WORKDIR /app

FROM base as build

COPY --link bun.lockb package.json ./
COPY --link . .

RUN bun install --production

CMD ["bun", "start"]