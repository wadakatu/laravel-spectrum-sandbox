.PHONY: up down build logs clean shell-app shell-laravel-11

# Default target
up:
	docker-compose up -d
	@echo "Sandbox is running at http://localhost:8088"

# Stop all containers
down:
	docker-compose down

# Build all containers
build:
	docker-compose build --parallel

# View logs
logs:
	docker-compose logs -f

# Clean up everything
clean:
	docker-compose down -v
	docker system prune -f

# Shell into the main app
shell-app:
	docker-compose exec sandbox-app sh

# Shell into Laravel 11 container
shell-laravel-11:
	docker-compose exec laravel-11 bash

# Restart a specific service
restart-%:
	docker-compose restart $*

# Rebuild a specific service
rebuild-%:
	docker-compose build $*
	docker-compose up -d $*

# View logs for a specific service
logs-%:
	docker-compose logs -f $*