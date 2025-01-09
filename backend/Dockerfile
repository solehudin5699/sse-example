FROM solehudin5699/alpine:node18.20.4

WORKDIR /app

COPY package*.json .

RUN npm install

COPY . .

CMD [ "npm","start" ]

EXPOSE 5001