# 构建镜像
docker build -t idocker-registry:latest .

# 运行容器
docker run -d \
  --name idocker-registry \
  -p 8080:8080 \
  -v registry-data:/var/lib/registry \
  -v app-data:/app/data \
  -e REGISTRY_URL=http://localhost:5000 \
  idocker-registry:latest
