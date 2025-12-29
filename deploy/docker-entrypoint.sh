#!/bin/sh
set -e

echo "=========================================="
echo "Starting IDocker Registry..."
echo "=========================================="
echo "                                          "
echo "                                          "
echo "------------------------------------------"



########## Start Docker Registry
echo ">>> Starting Docker Registry..."
echo "------------------------------------------"
echo "                                          "

docker-registry serve /etc/docker/registry/config.yml &
REGISTRY_PID=$(pgrep -f docker-registry)
sleep 3

# Check if Registry started successfully
if ! kill -0 $REGISTRY_PID 2>/dev/null; then
  echo ">>> Error: Docker Registry failed to start"
  exit 1
fi

echo "                                          "
echo "------------------------------------------"
echo ">>> Docker Registry started (PID: $REGISTRY_PID)"
echo "------------------------------------------"
########## Start Docker Registry



########## Start iDocker Service
echo ">>> Starting iDocker Registry Service ..."
echo "------------------------------------------"
echo "                                          "

node /app/idocker/index.js &
SERVER_PID=$!
sleep 3

# Check if Registry started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo ">>> Error: iDocker Service failed to start"
  exit 1
fi

echo "                                          "
echo "------------------------------------------"
echo ">>> iDocker Service started (PID: $SERVER_PID)"
echo "------------------------------------------"
echo "                                          "
echo "                                          "
########## Start iDocker Service




########## Show iDocker Registry Visit Info
echo "=========================================="
echo "   IDocker Registry Service started !"
echo "     Web UI: http://localhost:7518" 
echo " Docker API: http://localhost:7518/v2/"
echo "=========================================="
echo "                                          "
echo "                                          "



########## Wait for backend service
wait $SERVER_PID
