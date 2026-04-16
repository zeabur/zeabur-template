FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget git openssh-client gnupg2 \
    vim nano less man-db \
    jq bc fzf ripgrep tree unzip zip tar \
    procps psmisc lsof socat iproute2 dnsutils \
    python3 python3-pip make g++ cmake \
    ffmpeg \
    sudo rsync tmux \
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

# Bun - required for Claude Code channel plugins
RUN curl -fsSL https://bun.sh/install | bash && \
    cp /root/.bun/bin/bun /usr/local/bin/bun && \
    cp /root/.bun/bin/bunx /usr/local/bin/bunx && \
    chmod +x /usr/local/bin/bun /usr/local/bin/bunx

# Claude Code - installed outside /home/node so it survives volume mount at runtime
RUN HOME=/opt/claude-home bash -c 'curl -fsSL https://claude.ai/install.sh | bash' && \
    ln -sf /opt/claude-home/.local/bin/claude /usr/local/bin/claude && \
    /usr/local/bin/claude --version

# Homebrew - shallow clone at build time; startup.sh seeds it into volume on first boot
RUN mkdir -p /home/linuxbrew/.linuxbrew && \
    git clone --depth=1 https://github.com/Homebrew/brew.git /home/linuxbrew/.linuxbrew/Homebrew && \
    mkdir -p /home/linuxbrew/.linuxbrew/bin && \
    ln -s /home/linuxbrew/.linuxbrew/Homebrew/bin/brew /home/linuxbrew/.linuxbrew/bin/brew && \
    chown -R node:node /home/linuxbrew

# Claude plugins marketplace - preclone + preinstall plugin deps at build time
RUN git clone --depth=1 https://github.com/anthropics/claude-plugins-official.git /opt/claude-plugins-official && \
    for plugin in telegram discord fakechat; do \
      src=/opt/claude-plugins-official/external_plugins/$plugin; \
      if [ -f "$src/package.json" ]; then (cd "$src" && /usr/local/bin/bun install); fi; \
    done

RUN mkdir -p /home/node && chown node:node /home/node

ENV HOME=/home/node
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH="/home/node/.npm-global/bin:/home/node/.local/bin:$PATH"

WORKDIR /home/node
VOLUME ["/home/node"]

CMD ["sleep", "infinity"]
