wsl --update

docker-compose -f docker\docker-compose.yml down
docker-compose -f docker\docker-compose.yml up -d --build
Start-Process "http://localhost:8080"
