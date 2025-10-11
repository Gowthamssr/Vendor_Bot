import { Pool } from 'pg'

// Main application pool with explicit configuration
const appPool = new Pool({
  user: 'neondb_owner',
  password: 'npg_teHVJd0MrmW5',
  host: 'ep-steep-sky-a121ba2b-pooler.ap-southeast-1.aws.neon.tech',
  database: 'neondb',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  },
  // Add connection timeout
  connectionTimeoutMillis: 5000,
  // Add idle timeout
  idleTimeoutMillis: 30000,
})



export async function initializeDatabase() {
  const client = await appPool.connect()
  try {
    console.log('🔄 Initializing database...')
    
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector')
    
    // Initialize the application database
    await initializeAppDatabase(client)
    
    console.log('✅ Database initialization completed successfully!')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    client.release()
  }
}

async function initializeAppDatabase(client: any) {
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
