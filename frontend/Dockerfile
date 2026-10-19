FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
ENV NODE_ENV=development
RUN npm ci --include=dev --include=optional --foreground-scripts || (cat /root/.npm/_logs/*debug-0.log; exit 1)
RUN npm ls vite --depth=0 && test -x node_modules/.bin/vite
COPY . .
RUN ./node_modules/.bin/vite build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
