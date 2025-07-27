#!/bin/bash

# Build API image
echo "Building API image..."
docker build -t laravel-spectrum-sandbox-api:latest -f api/Dockerfile ..

# Build universal sandbox image
echo "Building universal sandbox image..."
docker build -t laravel-spectrum-sandbox:universal -f sandbox/Dockerfile.universal sandbox/

echo "All images built successfully!"
echo ""
echo "The universal image supports:"
echo "- PHP: 8.1, 8.2, 8.3, 8.4"
echo "- Laravel: 10, 11, 12"
echo "- Lumen: 10, 11, 12"
echo ""
echo "Versions are selected dynamically at runtime."