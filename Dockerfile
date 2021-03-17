FROM node:14.8.0

RUN mkdir /app
COPY package.json /app
WORKDIR /app
RUN npm install --production
RUN npm install cross-env

COPY index.js /app
COPY api-doc.yml /app
COPY lib /app/lib

EXPOSE 80

CMD ["npm", "run", "start"]