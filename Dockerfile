# Run hscli without a local Node install:
#   docker run --rm -e HSCLI_DOCS_API_KEY ghcr.io/wavyx/hscli docs site list
#
# The image installs the published npm package, so build it after publishing
# (the release workflow passes the released version via HSCLI_VERSION).
FROM node:20-slim

ARG HSCLI_VERSION=latest

LABEL org.opencontainers.image.source="https://github.com/wavyx/hscli"
LABEL org.opencontainers.image.description="Command-line interface for Help Scout"
LABEL org.opencontainers.image.licenses="MIT"

RUN npm install -g "@wavyx/hscli@${HSCLI_VERSION}" \
  && npm cache clean --force

ENTRYPOINT ["hscli"]
CMD ["--help"]
