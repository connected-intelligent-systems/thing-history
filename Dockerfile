FROM node:14.8.0

RUN mkdir /app
COPY package.json /app
COPY ./docker/run.sh /app/run.sh

WORKDIR /app
RUN npm install --production
RUN npm install cross-env

COPY index.js /app
COPY lib /app/lib

EXPOSE 8080

CMD ["/app/run.sh"]
