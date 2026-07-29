#!/bin/sh
set -e

npm install -g nodemon >/dev/null 2>&1

echo ">>> Starting Docker Registry..."
docker-registry serve /etc/docker/registry/config.yml &
sleep 3

echo ">>> Starting iDocker Service with hot reload (polling mode)..."
cd /app/idocker
nodemon --legacy-watch --watch /app/idocker --ignore node_modules --signal SIGTERM index.js
