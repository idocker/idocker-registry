# 多阶段构建
FROM node:18-alpine as builder
WORKDIR /app

# 构建后端
COPY idocker-registry-server/package*.json idocker-registry-server/
RUN cd idocker-registry-server && npm install
COPY idocker-registry-server idocker-registry-server
RUN cd idocker-registry-server && npm run build

# 构建前端
COPY idocker-registry-ui/package*.json idocker-registry-ui/
RUN cd idocker-registry-ui && npm install
COPY idocker-registry-ui idocker-registry-ui
RUN cd idocker-registry-ui && npm run build

# 运行时镜像
FROM node:18-alpine
WORKDIR /app

# 安装 Docker Registry
RUN apk add --no-cache docker-registry

# 复制后端文件
COPY --from=builder /app/idocker-registry-server/package*.json ./
COPY --from=builder /app/idocker-registry-server/node_modules ./node_modules
COPY --from=builder /app/idocker-registry-server/dist ./dist
COPY --from=builder /app/idocker-registry-server/database ./database

# 复制前端构建产物
COPY --from=builder /app/idocker-registry-ui/dist ./public

# 复制 Registry 配置文件
COPY deploy/config.yaml /etc/docker/registry/config.yml

# 复制启动脚本
COPY deploy/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 创建数据目录
RUN mkdir -p /var/lib/registry /app/data

EXPOSE 8080
CMD ["docker-entrypoint.sh"]
