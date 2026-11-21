FROM node:22-alpine
WORKDIR /app
COPY server/package*.json server/
RUN cd server && npm ci --omit=dev
COPY . .
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
VOLUME /data
EXPOSE 3000
CMD ["node", "--disable-warning=ExperimentalWarning", "server/server.js"]
