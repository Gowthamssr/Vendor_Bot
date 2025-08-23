#!/usr/bin/env tsx

import { initializeDatabase } from '../lib/db-init'

async function main() {
  try {
    console.log('🚀 Starting database setup...')
    await initializeDatabase()
    console.log('✅ Database setup completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

main()
