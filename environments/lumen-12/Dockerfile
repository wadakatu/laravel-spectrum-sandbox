ARG PHP_VERSION=8.2
FROM php:${PHP_VERSION}-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev zip unzip \
    nodejs npm python3 build-essential \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node dependencies for terminal server
RUN npm install -g node-pty ws

# Create Lumen project
ARG LUMEN_VERSION="^12.0"
WORKDIR /app
# Lumen 12 might not be available yet, fallback to 11 then 10
RUN composer create-project laravel/lumen:${LUMEN_VERSION} . --no-interaction || \
    composer create-project laravel/lumen:^11.0 . --no-interaction || \
    composer create-project laravel/lumen:^10.0 . --no-interaction

# Install Laravel Spectrum
ARG SPECTRUM_VERSION="*"
RUN composer require wadakatu/laravel-spectrum:${SPECTRUM_VERSION} --dev --no-interaction || \
    composer require wadakatu/laravel-spectrum --dev --no-interaction || \
    echo "Laravel Spectrum not available, creating mock"

# Copy terminal server
COPY terminal-server.js /usr/local/bin/terminal-server
RUN chmod +x /usr/local/bin/terminal-server

# Setup entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create demo API routes for Lumen
RUN echo '<?php\n\
$router->group(["prefix" => "api"], function () use ($router) {\n\
    $router->get("/users", function () {\n\
        return response()->json([\n\
            ["id" => 1, "name" => "John Doe", "email" => "john@example.com"],\n\
            ["id" => 2, "name" => "Jane Smith", "email" => "jane@example.com"]\n\
        ]);\n\
    });\n\
    \n\
    $router->post("/users", function () use ($router) {\n\
        return response()->json(["message" => "User created"], 201);\n\
    });\n\
    \n\
    $router->get("/users/{id}", function ($id) {\n\
        return response()->json([\n\
            "id" => $id,\n\
            "name" => "John Doe",\n\
            "email" => "john@example.com"\n\
        ]);\n\
    });\n\
    \n\
    $router->put("/users/{id}", function ($id) {\n\
        return response()->json(["message" => "User updated", "id" => $id]);\n\
    });\n\
    \n\
    $router->delete("/users/{id}", function ($id) {\n\
        return response()->json(["message" => "User deleted", "id" => $id]);\n\
    });\n\
});' > routes/web.php

EXPOSE 7112

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "/usr/local/bin/terminal-server"]