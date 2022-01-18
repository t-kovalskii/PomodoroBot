FROM node
WORKDIR user/src/app

COPY . .
RUN npm install

CMD ["npm", "start"]
