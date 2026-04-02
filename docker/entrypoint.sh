set -e

echo "Iniciando Meditação Zen..."

echo "Aguardando MySQL..."
while ! mysqladmin ping -h mysql -u meditacao_user -pmeditacao_pass --silent; do
    sleep 1
done

echo "MySQL está disponível!"

# necessary directories
mkdir -p /var/www/html/logs
mkdir -p /var/www/html/uploads/audio
mkdir -p /var/www/html/uploads/user-audio

# permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html
chmod -R 777 /var/www/html/logs
chmod -R 777 /var/www/html/uploads

echo "Iniciando Apache..."
exec apache2-foreground