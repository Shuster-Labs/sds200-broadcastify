FROM debian:bookworm-slim

# Install Node.js 20 LTS + FFmpeg with MP3 support
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    ffmpeg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/
COPY test-connection.js ./

# Config is mounted at runtime — do not bake credentials into the image
VOLUME ["/app/config"]
ENV CONFIG_PATH=/app/config/config.json

# Health check: verify the process is still running
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD pgrep -f "node src/index.js" > /dev/null || exit 1

CMD ["node", "src/index.js"]
