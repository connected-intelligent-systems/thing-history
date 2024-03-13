FROM node:20-slim

RUN apt-get update && apt-get install -y \
  curl \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir /app
COPY package.json /app
COPY ./docker/run.sh /app/run.sh

WORKDIR /app
RUN npm install --production
RUN npm install cross-env

COPY index.js /app
COPY api-doc.yml /app
COPY lib /app/lib

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:3000 || exit 1

CMD ["/app/run.sh"]
