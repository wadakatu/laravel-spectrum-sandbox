# Laravel Spectrum Sandbox

Interactive sandbox for testing [Laravel Spectrum](https://github.com/wadakatu/laravel-spectrum) commands.

## Features

- ✅ Live code editing with Monaco Editor
- ✅ Dynamic command output based on your code
- ✅ Real-time route analysis
- ✅ Validation rule detection
- 🚧 API Resource field analysis (coming soon)
- 🚧 Authentication detection (coming soon)

## Current Version: v0.3.0

### What's New
- Dynamic code analysis
- Routes are detected from your code
- Command outputs update based on your changes
- OpenAPI preview shows your actual routes

## Usage

1. Edit the sample files in the editor
2. Click any command button to see the output
3. The generated documentation reflects your code changes

Try:
- Adding new routes in `routes/api.php`
- Modifying validation rules in `StoreUserRequest.php`
- Changing the controller methods

## Development

```bash
npm install
npm run serve
```

Visit http://localhost:8085