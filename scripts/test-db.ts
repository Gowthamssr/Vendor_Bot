import { Pool } from 'pg';

// Direct database configuration
const dbConfig = {
  user: 'neondb_owner',
  password: 'npg_teHVJd0MrmW5',
  host: 'ep-steep-sky-a121ba2b-pooler.ap-southeast-1.aws.neon.tech',
  database: 'neondb',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000
};

async function testConnection() {
  console.log('🔍 Testing database connection with direct configuration...');
  
  const pool = new Pool(dbConfig);

  try {
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database');
    
    // Test a simple query
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version);
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
