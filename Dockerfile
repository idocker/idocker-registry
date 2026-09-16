# ============================================ Multi-stage build
FROM idocker.vip/node:22 AS builder
WORKDIR /app

RUN apk add --update --no-cache curl jq py3-configobj py3-pip py3-setuptools python3 python3-dev make gcc g++
#RUN apk add make gcc g++ python3 python3-pip && pip install setuptools
RUN npm config set registry  https://registry.npmmirror.com

# Copy backend dependencies and source code 
COPY idocker-registry-server/package*.json /app/idocker/
RUN cd idocker && npm install --only=production
COPY idocker-registry-server /app/idocker

# Build frontend
COPY idocker-registry-ui/package*.json /app/ui/
RUN cd /app/ui && npm install
COPY idocker-registry-ui /app/ui
RUN cd /app/ui && npm run build

# ============================================ Runtime image
FROM node:22-alpine
WORKDIR /app

# Install Docker Registry (+ tzdata so the container honours TZ=Asia/Shanghai)
RUN apk add --no-cache docker-registry tzdata

# Copy backend build artifacts
COPY --from=builder /app/idocker /app/idocker

# Copy frontend build artifacts
COPY --from=builder /app/ui/dist /app/idocker/public

# Copy Registry configuration
COPY deploy/config.yaml /etc/docker/registry/config.yml

# Copy startup script
COPY deploy/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directories
RUN mkdir -p /var/lib/registry /app/data /app/logs 

EXPOSE 7518
EXPOSE 7519

CMD ["docker-entrypoint.sh"]
