import appPool, { initializeDatabase } from './db-init'

// Initialize database on startup
let isInitialized = false

export async function ensureDatabaseInitialized() {
  if (!isInitialized) {
    await initializeDatabase()
    isInitialized = true
  }
}

// Initialize database when this module is imported
if (process.env.NODE_ENV !== 'test') {
  ensureDatabaseInitialized().catch(console.error)
}

export default appPool
