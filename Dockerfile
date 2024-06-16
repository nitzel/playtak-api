FROM node:lts-alpine as development
ENV NODE_ENV=development
WORKDIR /app
RUN npm i -g @nestjs/cli
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

RUN --mount=type=cache,target=/app/.npmcache \
    npm install --cache /app/.npmcache --loglevel error

ENTRYPOINT npm run start:dev


FROM node:lts-alpine as production
ENV NODE_ENV=production
WORKDIR /app
RUN npm i -g @nestjs/cli
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production && mv node_modules ../
COPY . .
RUN chown -R node /app
USER node
RUN npm run build
ENTRYPOINT npm run start:prod
