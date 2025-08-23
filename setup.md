# Quick Setup Guide

## 1. Install Dependencies
```bash
npm install
```

## 2. Environment Setup
Copy the example environment file and configure it:
```bash
cp env.example .env.local
```

Edit `.env.local` with your actual values:
- `DATABASE_URL`: Your PostgreSQL connection string (database will be created automatically)
- `JWT_SECRET`: A random secret key for JWT tokens
- `GEMINI_API_KEY`: Your Google Gemini API key

**Important**: Make sure PostgreSQL is running and accessible. The database will be created automatically when you start the application.

## 3. Database Setup (Automatic)
The database will be set up automatically when you start the application, but you can also run it manually:

```bash
# Optional: Run database setup manually
npm run setup-db
```

This will:
- ✅ Create the database if it doesn't exist
- ✅ Enable the pgvector extension
- ✅ Create all required tables and indexes
- ✅ Set up the complete schema

## 4. Start Development Server
```bash
npm run dev
```

The application will automatically:
- Initialize the database on first run
- Create all necessary tables and extensions
- Start the development server

## 5. Access the Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Getting Started
1. Register a new account
2. Add some sales data using the form or natural language entry
3. Start chatting with the AI about your sales data!

## Example Usage
- **Add a sale**: "Sold 5 bags of rice at $10 each today"
- **Ask questions**: "What were my total sales this month?"
- **Get insights**: "How much rice did I sell this year?"

## Troubleshooting

### Database Connection Issues
If you encounter database connection issues:

1. **Make sure PostgreSQL is running**:
   ```bash
   # On Windows (if using WSL or similar)
   sudo service postgresql start
   
   # On macOS (if using Homebrew)
   brew services start postgresql
   
   # On Linux
   sudo systemctl start postgresql
   ```

2. **Check your DATABASE_URL format**:
   ```
   postgresql://username:password@localhost:5432/vendor_sales_db
   ```

3. **Run database setup manually**:
   ```bash
   npm run setup-db
   ```

### Manual Database Creation (if needed)
If automatic database creation fails, you can create it manually:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE vendor_sales_db;

-- Connect to the new database
\c vendor_sales_db

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```
