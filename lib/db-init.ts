import { Pool } from 'pg'

// Initial connection without database name to create database
const initialPool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/postgres'), // Connect to default postgres database
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Main application pool
const appPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...')
    
    // Extract database name from DATABASE_URL
    const dbName = process.env.DATABASE_URL?.split('/').pop()?.split('?')[0]
    if (!dbName) {
      throw new Error('Database name not found in DATABASE_URL')
    }

    // Check if database exists
    const dbExists = await checkDatabaseExists(dbName)
    
    if (!dbExists) {
      console.log(`📦 Creating database: ${dbName}`)
      await createDatabase(dbName)
    } else {
      console.log(`✅ Database ${dbName} already exists`)
    }

    // Initialize the application database
    await initializeAppDatabase()
    
    console.log('✅ Database initialization completed successfully!')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    await initialPool.end()
  }
}

async function checkDatabaseExists(dbName: string): Promise<boolean> {
  try {
    const result = await initialPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('Error checking database existence:', error)
    return false
  }
}

async function createDatabase(dbName: string) {
  try {
    await initialPool.query(`CREATE DATABASE "${dbName}"`)
    console.log(`✅ Database ${dbName} created successfully`)
  } catch (error) {
    console.error(`❌ Failed to create database ${dbName}:`, error)
    throw error
  }
}

async function initializeAppDatabase() {
  try {
    // Try to enable pgvector extension (will fail gracefully if not available)
    console.log('🔧 Checking for pgvector extension...')
    try {
      await appPool.query('CREATE EXTENSION IF NOT EXISTS vector')
      console.log('✅ pgvector extension enabled')
    } catch (error) {
      console.log('⚠️  pgvector extension not available, continuing without vector support')
    }
    
    // Create users table
    console.log('👥 Creating users table...')
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create sales table (with optional vector support)
    console.log('💰 Creating sales table...')
    const vectorColumn = await checkVectorSupport() 
      ? 'vector_embedding VECTOR(384),' 
      : '-- vector_embedding VECTOR(384), -- pgvector not available'
    
    await appPool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        sale_date DATE NOT NULL,
        ${vectorColumn}
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create indexes
    console.log('📊 Creating indexes...')
    await appPool.query('CREATE INDEX IF NOT EXISTS idx_sales_vendor_id ON sales(vendor_id)')
    await appPool.query('CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)')
    await appPool.query('CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_name)')
    
    // Create vector index only if pgvector is available
    if (await checkVectorSupport()) {
      try {
        await appPool.query('CREATE INDEX IF NOT EXISTS idx_sales_vector ON sales USING ivfflat (vector_embedding vector_cosine_ops) WITH (lists = 100)')
        console.log('✅ Vector index created')
      } catch (error) {
        console.log('⚠️  Vector index creation failed, continuing without vector search')
      }
    }
    
    console.log('✅ Database schema created successfully')
  } catch (error) {
    console.error('❌ Failed to initialize app database:', error)
    throw error
  }
}

async function checkVectorSupport(): Promise<boolean> {
  try {
    const result = await appPool.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
    return result.rows.length > 0
  } catch (error) {
    return false
  }
}

// Export the main pool for use in the application
export default appPool
