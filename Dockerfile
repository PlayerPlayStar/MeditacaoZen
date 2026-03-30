FROM php:8.1-apache

#INSTALAR AS DEPENDÊNCIAS DO DOCKER
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    default-mysql-client \
    zip \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

#INSTALAR AS EXTENSÕES DO PHP
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        zip \
        mbstring \
        curl \
        gd


RUN a2enmod rewrite

#CONFIGURAR APACHE PARA FUNCIONAR COM PHP
RUN echo 'LoadModule php_module /usr/local/lib/apache2/modules/libphp.so' > /etc/apache2/conf-available/php.conf \
    && echo 'AddType application/x-httpd-php .php' >> /etc/apache2/conf-available/php.conf \
    && echo 'DirectoryIndex index.php' >> /etc/apache2/conf-available/php.conf \
    && a2enconf php

#CONFIG DO APACHE
RUN echo '<Directory /var/www/html>\n\
    AllowOverride All\n\
    Require all granted\n\
    DirectoryIndex index.php\n\
    Options Indexes FollowSymLinks\n\
</Directory>' > /etc/apache2/conf-available/docker-php.conf \
    && a2enconf docker-php

#CONFIGURAÇÃO DO PHP PARA UPLOAD
COPY config/php-uploads.ini /usr/local/etc/php/conf.d/uploads.ini

#DIRETÓRIO E COPIAR OS ARQUIVOS/NÃO COPIAR PASTA DO DOCKER
WORKDIR /var/www/html
COPY . /var/www/html/
RUN rm -rf /var/www/html/docker

#PERMISSÕES
RUN mkdir -p /var/www/html/logs \
    && mkdir -p /var/www/html/uploads/audio \
    && mkdir -p /var/www/html/uploads/user-audio \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 777 /var/www/html/logs \
    && chmod -R 777 /var/www/html/uploads

#LIBERAR PORTA 80
EXPOSE 80

#INICIAR O APACHE
CMD ["apache2-foreground"]