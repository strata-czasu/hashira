ARG NODE_VERSION=20

FROM mcr.microsoft.com/devcontainers/javascript-node:${NODE_VERSION}

ARG BUN_VERSION=bun-v1.1.0
ENV BUN_INSTALL=/usr/local

RUN apt-get update \
    && apt-get -y install --no-install-recommends git \
    && curl -fsSL https://bun.sh/install | bash -s "${BUN_VERSION}"
