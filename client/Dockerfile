FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
COPY . .
CMD ["npm", "start"]
