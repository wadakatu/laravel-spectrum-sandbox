#!/bin/bash
set -e

# Ensure storage directories exist and have correct permissions
mkdir -p storage/app/spectrum storage/logs storage/framework/{cache,sessions,views}
if [ -d "bootstrap/cache" ]; then
    chmod -R 777 storage bootstrap/cache
else
    chmod -R 777 storage
fi

# Clear any existing caches (Lumen may not have all these commands)
php artisan cache:clear 2>/dev/null || true

# Generate application key if not exists
if ! grep -q "^APP_KEY=" .env 2>/dev/null; then
    echo "APP_KEY=base64:$(openssl rand -base64 32)" >> .env
fi

# Publish Spectrum config if not exists (Lumen doesn't have vendor:publish)
# if [ ! -f "config/spectrum.php" ]; then
#     php artisan vendor:publish --provider="LaravelSpectrum\SpectrumServiceProvider" --force
# fi

# Start the terminal server
exec "$@"