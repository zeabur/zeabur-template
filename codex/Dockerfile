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

RUN npm install -g @openai/codex@latest

RUN mkdir -p /home/node && chown node:node /home/node

ENV HOME=/home/node
VOLUME ["/home/node"]

CMD ["sleep", "infinity"]
