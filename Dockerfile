# syntax=docker/dockerfile:1

# React front-end
FROM node:16-alpine AS client-build
WORKDIR /usr/src/tictactoe-ai-docker
COPY client/ ./client/
COPY ["package.json", "package-lock.json", "./"] ./client/
RUN cd client && npm install && npm run build

# NodeJS back-end
FROM node:16-alpine AS server-build
WORKDIR /usr/src/tictactoe-ai-docker
COPY --from=client-build /usr/src/tictactoe-ai-docker/client/build ./client/build
COPY ["package.json", "package-lock.json", "./"]
RUN npm install
COPY index.js ./

# Additional backend
RUN apk update && apk add g++ make bash && rm -rf /var/cache/apk/*
#RUN apt update -y && apt upgrade -y
COPY TicTacToeGameAI/ ./TicTacToeGameAI/
RUN cd TicTacToeGameAI && make play && chmod u+x play

EXPOSE 3002

CMD ["node", "index.js", "--expose-gc"]