FROM node:20

RUN mkdir /app
COPY package.json /app
COPY ./docker/run.sh /app/run.sh

WORKDIR /app
RUN npm install --production
RUN npm install cross-env

COPY index.js /app
COPY lib /app/lib

EXPOSE 3000

CMD ["/app/run.sh"]
