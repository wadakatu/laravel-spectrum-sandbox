#!/bin/bash
set -e

# Ensure storage directories exist and have correct permissions
mkdir -p storage/app/spectrum storage/logs storage/framework/{cache,sessions,views}
chmod -R 777 storage bootstrap/cache

# Clear any existing caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Generate application key if not exists
if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
    php artisan key:generate
fi

# Publish Spectrum config if not exists
if [ ! -f "config/spectrum.php" ]; then
    php artisan vendor:publish --provider="LaravelSpectrum\SpectrumServiceProvider" --force
fi

# Start the terminal server
exec "$@"