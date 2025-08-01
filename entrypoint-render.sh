#!/bin/bash
set -e

# Create necessary directories
mkdir -p /app/laravel/storage/app/spectrum
mkdir -p /app/laravel/storage/logs
mkdir -p /app/laravel/storage/framework/{cache,sessions,views}
mkdir -p /app/laravel/bootstrap/cache

# Set permissions
chown -R www-data:www-data /app/laravel/storage /app/laravel/bootstrap/cache
chmod -R 775 /app/laravel/storage /app/laravel/bootstrap/cache

# Generate Laravel app key if not set
cd /app/laravel
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --ansi
fi

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Create demo routes if they don't exist
if [ ! -f "routes/api.php" ]; then
    cp /app/demo-api.php routes/api.php
fi

# Start supervisord
exec "$@"