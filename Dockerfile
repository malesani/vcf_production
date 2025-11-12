FROM php:8.2-apache

# Copia il php.ini personalizzato
COPY ./config/php.ini /usr/local/etc/php/

# Imposta la directory di lavoro
WORKDIR /var/www/html

# Copia i file del progetto (opzionale, usa bind mount nel docker-compose.yml)
# COPY ./src /var/www/html

# Abilita moduli Apache e PHP necessari (se richiesti)
RUN docker-php-ext-install mysqli pdo pdo_mysql && a2enmod rewrite
