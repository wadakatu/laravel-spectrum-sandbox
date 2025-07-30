# Laravel Spectrum Interactive Sandbox

An interactive web-based sandbox environment for testing [Laravel Spectrum](https://github.com/wadakatu/laravel-spectrum) across multiple Laravel and Lumen versions.

## Features

- 🚀 **Multiple Environments**: Test on Laravel 10, 11, 12 and Lumen 10, 11, 12
- 🖥️ **Web Terminal**: Full xterm.js terminal with WebSocket communication
- 📁 **File Explorer**: Browse generated files and outputs
- 🎯 **Command Palette**: Quick access to common Spectrum commands
- 💾 **Download Results**: Export generated OpenAPI/Postman files
- 🔄 **Live Updates**: Real-time file system monitoring

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourname/laravel-spectrum-sandbox
cd laravel-spectrum-sandbox
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Build and start the containers:
```bash
make up
```

4. Access the sandbox at http://localhost:8088

## Usage

1. Select your desired Laravel/Lumen version from the home page
2. Use the terminal to run Laravel Spectrum commands
3. Use the command palette for quick command execution
4. Browse generated files in the file explorer
5. View output files in the output viewer
6. Download generated files using the download button

## Available Commands

- `php artisan spectrum:generate` - Generate OpenAPI documentation
- `php artisan spectrum:watch` - Start the preview server
- `php artisan spectrum:mock` - Start the mock server
- `php artisan spectrum:export:postman` - Export to Postman
- `php artisan spectrum:export:insomnia` - Export to Insomnia
- `php artisan spectrum:cache:clear` - Clear the cache

## Architecture

- **Nginx**: Reverse proxy routing requests to appropriate containers
- **Node.js App**: Main application serving the UI and handling WebSocket connections
- **Environment Containers**: Separate containers for each Laravel/Lumen version
- **Terminal Server**: WebSocket-based terminal server in each environment

## Development

### Building specific environments:
```bash
make rebuild-laravel-11
```

### Viewing logs:
```bash
make logs-laravel-11
```

### Shell access:
```bash
make shell-laravel-11
```

## Troubleshooting

### Container won't start
- Check port availability: 8088, 7010-7012, 7110-7112
- Ensure Docker daemon is running
- Check logs: `make logs`

### Terminal not connecting
- Check WebSocket connection in browser console
- Verify Nginx proxy configuration
- Check terminal server logs: `make logs-laravel-11`

### Files not updating
- Ensure file watchers are working in containers
- Check permissions on mounted volumes
- Restart the specific container: `make restart-laravel-11`

## License

MIT License