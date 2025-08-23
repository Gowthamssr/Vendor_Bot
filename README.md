# Vendor Sales & Insights Platform

A modern web application that helps vendors track, manage, and gain insights from their sales data using a natural language-powered chatbot.

## Features

### 🔐 Authentication & Security
- Secure user registration and login
- JWT-based authentication with HTTP-only cookies
- Data isolation per vendor

### 💬 AI-Powered Chatbot
- Natural language questions about sales data
- Powered by Google Gemini AI
- Ask questions like:
  - "What were my total sales this month?"
  - "How much rice did I sell this year?"
  - "What's my best selling product?"
  - "Show me sales from last week"

### 📊 Flexible Data Entry
1. **Form-Based Input**: Traditional form for manual entry
2. **Natural Language Input**: Type sales in plain English
   - "Sold 5 bags of rice at $10 each today"
   - "10 bottles of coke for $2.50 each on 2024-01-15"
3. **Bulk Excel Upload**: Upload Excel files for bulk data entry (coming soon)

## Technology Stack

- **Frontend & Backend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with pgvector for semantic search
- **AI/LLM**: Google Gemini API
- **Authentication**: JWT with bcrypt
- **File Uploads**: Uploadthing (for future Excel uploads)

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+ with pgvector extension
- Google Gemini API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vendor_bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database Configuration (database will be created automatically)
   DATABASE_URL=postgresql://postgres:password@localhost:5432/vendor_sales_db
   
   # JWT Secret for authentication
   JWT_SECRET=your-super-secret-jwt-key-here
   
   # Gemini API Key
   GEMINI_API_KEY=your-gemini-api-key-here
   
   # Uploadthing Configuration (for future file uploads)
   UPLOADTHING_SECRET=your-uploadthing-secret
   UPLOADTHING_APP_ID=your-uploadthing-app-id
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   The application will automatically:
   - ✅ Create the database if it doesn't exist
   - ✅ Enable the pgvector extension
   - ✅ Create all required tables and indexes
   - ✅ Set up the complete schema

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Setup (Automatic)

The database is set up automatically when you start the application. However, you can also run the setup manually:

```bash
# Optional: Run database setup manually
npm run setup-db
```

This will:
- Create the database if it doesn't exist
- Enable the pgvector extension
- Create all required tables and indexes
- Set up the complete schema

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sales Table
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  sale_date DATE NOT NULL,
  vector_embedding VECTOR(384),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Sales
- `POST /api/sales` - Create new sale (form-based)
- `GET /api/sales` - Get all sales for current user
- `POST /api/sales/natural-language` - Create sale from natural language
- `POST /api/chat` - Chat with AI about sales data

## Usage Examples

### Natural Language Entry
Users can enter sales data in plain English:
- "Sold 5 bags of rice at $10 each today"
- "10 bottles of coke for $2.50 each on 2024-01-15"
- "3 loaves of bread at $3.99 per loaf yesterday"

### Chatbot Questions
Users can ask the AI assistant questions like:
- "What were my total sales this month?"
- "How much rice did I sell this year?"
- "What's my best selling product?"
- "Show me sales from last week"
- "What was my revenue in December?"

## Development

### Project Structure
```
vendor_bot/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── globals.css       # Global styles
├── components/           # React components
├── lib/                  # Utility functions
│   ├── auth.ts          # Authentication utilities
│   ├── db.ts            # Database connection
│   ├── db-init.ts       # Database initialization
│   ├── gemini.ts        # Gemini AI integration
│   ├── sales.ts         # Sales data functions
│   └── schema.sql       # Database schema
├── scripts/             # Setup scripts
└── package.json
```

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
npm start
```

## Troubleshooting

### Database Connection Issues
If you encounter database connection issues:

1. **Make sure PostgreSQL is running**
2. **Check your DATABASE_URL format**: `postgresql://username:password@localhost:5432/vendor_sales_db`
3. **Run database setup manually**: `npm run setup-db`

### Manual Database Creation (if needed)
If automatic database creation fails:

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
