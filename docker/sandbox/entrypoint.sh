#!/bin/bash

# Set PHP version based on environment variable
PHP_VERSION=${PHP_VERSION:-8.2}
update-alternatives --set php /usr/bin/php${PHP_VERSION}
update-alternatives --set php-config /usr/bin/php-config${PHP_VERSION}
update-alternatives --set phpize /usr/bin/phpize${PHP_VERSION}

echo "Using PHP ${PHP_VERSION}"
php -v

# Keep container running
tail -f /dev/null