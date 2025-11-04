# NeskiPDFs Laravel Backend

This is the Laravel backend for the NeskiPDFs PDF editor application.

## Requirements

- PHP 8.1 or higher
- Composer
- PostgreSQL database
- Web server (Apache/Nginx) with PHP-FPM

## Installation

1. Install dependencies:
```bash
composer install
```

2. Copy the environment file:
```bash
cp .env.example .env
```

3. Generate application key:
```bash
php artisan key:generate
```

4. Configure your database connection in `.env`:
```env
DB_CONNECTION=pgsql
DB_HOST=your_host
DB_PORT=5432
DB_DATABASE=pdf_data
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Or use DATABASE_URL for services like Neon
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

5. Run migrations:
```bash
php artisan migrate
```

## API Endpoints

All endpoints are prefixed with `/api`:

- `POST /api/pdf/merge` - Merge multiple PDF files
- `POST /api/pdf/metadata` - Get PDF metadata (page count, file info)
- `POST /api/pdf/rotate` - Rotate specified pages
- `POST /api/pdf/delete-pages` - Delete specified pages
- `POST /api/pdf/reorder` - Reorder pages according to specified order

## Development

Start the development server:
```bash
php artisan serve
```

The server will run on `http://localhost:8000` by default.

For production, you'll need to configure a web server (Apache/Nginx) to point to the `public` directory.

## Dependencies

- **setasign/fpdi** - PDF manipulation library (importing pages, merging)
- **setasign/fpdf** - PDF creation library (base for FPDI)

## CORS Configuration

CORS is configured to allow requests from any origin. For production, update `config/cors.php` to restrict allowed origins.

