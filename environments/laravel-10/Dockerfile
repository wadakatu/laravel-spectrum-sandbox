ARG PHP_VERSION=8.1
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

# Create Laravel project
ARG LARAVEL_VERSION="^10.0"
WORKDIR /app
RUN composer create-project laravel/laravel:${LARAVEL_VERSION} . --no-interaction

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

# Create demo API routes (same as Laravel 11)
RUN echo '<?php\n\
use Illuminate\Http\Request;\n\
use Illuminate\Support\Facades\Route;\n\
\n\
Route::get("/users", function () {\n\
    return response()->json([\n\
        ["id" => 1, "name" => "John Doe", "email" => "john@example.com"],\n\
        ["id" => 2, "name" => "Jane Smith", "email" => "jane@example.com"]\n\
    ]);\n\
});\n\
\n\
Route::post("/users", function (Request $request) {\n\
    $validated = $request->validate([\n\
        "name" => "required|string|max:255",\n\
        "email" => "required|email|unique:users"\n\
    ]);\n\
    return response()->json(["message" => "User created", "data" => $validated], 201);\n\
});\n\
\n\
Route::get("/users/{id}", function ($id) {\n\
    return response()->json([\n\
        "id" => $id,\n\
        "name" => "John Doe",\n\
        "email" => "john@example.com"\n\
    ]);\n\
});\n\
\n\
Route::put("/users/{id}", function (Request $request, $id) {\n\
    $validated = $request->validate([\n\
        "name" => "string|max:255",\n\
        "email" => "email"\n\
    ]);\n\
    return response()->json(["message" => "User updated", "id" => $id, "data" => $validated]);\n\
});\n\
\n\
Route::delete("/users/{id}", function ($id) {\n\
    return response()->json(["message" => "User deleted", "id" => $id]);\n\
});' > routes/api.php

EXPOSE 7010

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "/usr/local/bin/terminal-server"]