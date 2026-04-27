FROM node:18-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:18-slim

WORKDIR /app

# Install sirv-cli globally to serve the app
RUN npm install -g sirv-cli

COPY --from=build /app/public ./public

EXPOSE 5000

CMD ["sirv", "public", "--host", "0.0.0.0", "--port", "5000", "--no-clear"]
