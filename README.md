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

## Deploy to Render.com (Free Tier)

### Prerequisites

1. A [Render.com](https://render.com) account
2. This repository pushed to GitHub, GitLab, or Bitbucket

### Deployment Steps

1. **Fork or clone this repository** to your GitHub account

2. **Log in to Render.com** and click "New +" → "Web Service"

3. **Connect your repository**:
   - Select your Git provider
   - Choose the laravel-spectrum-sandbox repository
   - Grant permissions if needed

4. **Configure the service**:
   - **Name**: `laravel-spectrum-sandbox` (or your preferred name)
   - **Region**: Choose the closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty
   - **Runtime**: Docker
   - **Instance Type**: Free

5. **Environment Variables** (optional):
   - Add any custom environment variables if needed
   - The defaults in `.env.render` should work fine

6. **Deploy**:
   - Click "Create Web Service"
   - Wait for the build and deployment (10-15 minutes first time)
   - Your sandbox will be available at `https://your-service-name.onrender.com`

### Important Notes for Render Free Tier

- **Cold Starts**: Services sleep after 15 minutes of inactivity
- **Wake Time**: Takes 1-2 minutes to wake up from sleep
- **Limitations**: 
  - 512MB RAM
  - Shared CPU
  - Services spin down when inactive
- **Persistent Storage**: Not available on free tier (files reset on restart)

### Optimizations for Render

This repository includes several optimizations for Render's free tier:

1. **Consolidated Dockerfile** (`Dockerfile.render`):
   - Multi-stage build to reduce image size
   - Combined services using supervisord
   - Optimized for memory usage

2. **Loading States**:
   - Automatic detection of Render deployment
   - Loading overlay during cold starts
   - Health check endpoint for service status

3. **WebSocket Handling**:
   - Automatic URL detection for Render deployments
   - Reconnection logic for interrupted connections

### Troubleshooting

1. **Build Failures**:
   - Check the build logs in Render dashboard
   - Ensure all required files are committed
   - Verify Dockerfile.render syntax

2. **Service Won't Start**:
   - Check runtime logs for errors
   - Verify port configuration (must use PORT=10000)
   - Ensure health check endpoint responds

3. **WebSocket Connection Issues**:
   - Verify the service is fully awake
   - Check browser console for errors
   - Ensure HTTPS is being used

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