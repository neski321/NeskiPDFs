# Migration Guide: Express.js to Laravel

This guide explains how to migrate from the Express.js backend to the Laravel backend.

## Overview

The Laravel backend maintains the same API endpoints as the Express.js backend, so the frontend should work without changes if you're running both on the same domain. However, if you're running Laravel on a different port or domain, you'll need to configure CORS and update the frontend API calls.

## Step 1: Install Dependencies

Navigate to the `backend` directory and install PHP dependencies:

```bash
cd backend
composer install
```

## Step 2: Configure Environment

1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your database credentials:
```env
APP_NAME=NeskiPDFs
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
# Or use DATABASE_URL for Neon or other services
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

3. Generate the application key:
```bash
php artisan key:generate
```

## Step 3: Run Migrations

```bash
php artisan migrate
```

## Step 4: Start Laravel Server

For development:
```bash
php artisan serve
```

This will start the server on `http://localhost:8000` by default.

For production, configure a web server (Apache/Nginx) to point to the `public` directory.

## Step 5: Update Frontend (if needed)

### Option A: Same Domain Setup

If Laravel is running on the same domain as the frontend (e.g., using a reverse proxy), no changes are needed. The frontend already uses `/api/pdf/...` endpoints which match Laravel's routes.

### Option B: Different Port/Domain

If Laravel is running on a different port (e.g., `localhost:8000`), you have two options:

#### Option B1: Update Vite Config to Proxy API Requests

Update `vite.config.ts`:

```typescript
export default defineConfig({
  // ... existing config
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

#### Option B2: Update Frontend API Base URL

Create an environment variable for the API base URL and update `client/src/lib/pdfApi.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function mergePDFs(files: File[]): Promise<Blob> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('pdfs', file);
  });

  const response = await fetch(`${API_BASE_URL}/api/pdf/merge`, {
    method: 'POST',
    body: formData,
  });
  // ... rest of the function
}
```

Then set `VITE_API_URL=http://localhost:8000` in your `.env` file.

## Step 6: CORS Configuration

CORS is already configured to allow requests from any origin in development. For production, update `config/cors.php`:

```php
'allowed_origins' => [
    'http://localhost:5173', // Your frontend URL
    'https://yourdomain.com',
],
```

## API Endpoints

All endpoints remain the same:

- `POST /api/pdf/merge` - Merge multiple PDFs
- `POST /api/pdf/metadata` - Get PDF metadata
- `POST /api/pdf/rotate` - Rotate pages
- `POST /api/pdf/delete-pages` - Delete pages
- `POST /api/pdf/reorder` - Reorder pages

## Testing

Test the endpoints using curl or Postman:

```bash
# Test metadata endpoint
curl -X POST http://localhost:8000/api/pdf/metadata \
  -F "pdf=@test.pdf"
```

## Troubleshooting

### PDF Library Issues

If you encounter issues with PDF manipulation, ensure that:
1. The `setasign/fpdi` and `setasign/fpdf` packages are installed
2. PHP has the necessary extensions (mbstring, gd, etc.)

### CORS Issues

If you see CORS errors:
1. Check `config/cors.php` configuration
2. Ensure the `HandleCors` middleware is in the middleware stack
3. Check browser console for specific CORS errors

### Database Connection Issues

If you have database connection errors:
1. Verify your `.env` database configuration
2. Ensure PostgreSQL is running and accessible
3. Check that the database exists and credentials are correct

## Differences from Express.js Backend

1. **File Upload Handling**: Laravel uses built-in file validation instead of multer
2. **PDF Library**: Uses `setasign/fpdi` instead of `pdf-lib` (Node.js)
3. **Error Handling**: Laravel's exception handling and logging
4. **Session Management**: Laravel's built-in session management (if needed)

## Next Steps

1. Test all PDF operations
2. Configure production environment
3. Set up proper error logging
4. Configure file upload limits if needed (check `php.ini`)

