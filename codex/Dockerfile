FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget git openssh-client gnupg2 \
    vim nano less man-db \
    jq bc fzf ripgrep tree unzip zip tar \
    procps psmisc lsof socat iproute2 dnsutils \
    python3 make g++ \
    sudo rsync \
  && rm -rf /var/lib/apt/lists/*

# GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update && apt-get install -y --no-install-recommends gh \
  && rm -rf /var/lib/apt/lists/*

# ttyd - web terminal
RUN ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then TTYD_ARCH=x86_64; \
    elif [ "$ARCH" = "arm64" ]; then TTYD_ARCH=aarch64; \
    else echo "Unsupported arch: $ARCH" && exit 1; fi && \
    curl -fsSL -o /usr/local/bin/ttyd \
      "https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.${TTYD_ARCH}" && \
    chmod +x /usr/local/bin/ttyd

RUN npm install -g @openai/codex@latest

RUN mkdir -p /home/node && chown node:node /home/node

ENV HOME=/home/node
WORKDIR /home/node
VOLUME ["/home/node"]

CMD ["sleep", "infinity"]
