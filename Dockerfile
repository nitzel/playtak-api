FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN npm i -g @nestjs/cli
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
RUN chown -R node /usr/src/app
USER node
RUN npm run build
CMD ["npm", "run", "start:prod"]
