ARG NODE_VERSION=22

FROM mcr.microsoft.com/devcontainers/javascript-node:${NODE_VERSION}

ARG BUN_VERSION=bun-v1.2.0
ENV BUN_INSTALL=/usr/local

RUN apt-get update \
    && apt-get -y install --no-install-recommends git \
    && curl -fsSL https://bun.sh/install | bash -s "${BUN_VERSION}"

RUN wget https://www.1001fonts.com/download/now.zip \
    && unzip -d now/ now.zip \
    && mkdir -p /usr/share/fonts/opentype/ \
    && cp -r $PWD/now/ /usr/share/fonts/opentype/ \
    && rm -f now.zip \
    && rm -rf $PWD/now/ \
    && fc-cache -f -v
