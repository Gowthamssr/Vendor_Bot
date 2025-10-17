import appPool, { initializeDatabase } from './db-init'

// Use global to persist across hot reloads in development
declare global {
  var _dbInitialized: boolean | undefined
}

export async function ensureDatabaseInitialized() {
  if (!global._dbInitialized) {
    await initializeDatabase()
    global._dbInitialized = true
  }
}

// Initialize database when this module is imported (only once)
if (process.env.NODE_ENV !== 'test' && !global._dbInitialized) {
  ensureDatabaseInitialized().catch(console.error)
}

export default appPool
