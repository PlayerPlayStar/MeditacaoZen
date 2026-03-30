#!/bin/bash
set -e

echo "Iniciando Meditação Zen..."

# Aguardar MySQL estar disponível
echo "Aguardando MySQL..."
while ! mysqladmin ping -h mysql -u meditacao_user -pmeditacao_pass --silent; do
    sleep 1
done

echo "MySQL está disponível!"

# Criar diretórios necessários se não existirem ainda
mkdir -p /var/www/html/logs
mkdir -p /var/www/html/uploads/audio
mkdir -p /var/www/html/uploads/user-audio

# Define permissões
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html
chmod -R 777 /var/www/html/logs
chmod -R 777 /var/www/html/uploads

echo "Iniciando Apache..."
exec apache2-foreground