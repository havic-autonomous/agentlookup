const Database = require('better-sqlite3');
const { join } = require('path');

const DB_PATH = join(__dirname, 'data', 'agents.db');

console.log('Migrating database to add paid_features table...');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Check if table exists
const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='paid_features'").get();

if (!tableExists) {
  console.log('Creating paid_features table...');
  
  // Create table
  db.exec(`
    CREATE TABLE paid_features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
      feature_type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      starts_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      price_usdc REAL NOT NULL,
      tx_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_paid_features_agent ON paid_features(agent_id, status);
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_paid_features_expiry ON paid_features(expires_at, status);
  `);
  
  console.log('Table created successfully!');
  
  // Add some sample data for Alex Claw
  const alexAgent = db.prepare('SELECT id FROM agents WHERE slug = ?').get('alex-claw');
  
  if (alexAgent) {
    console.log('Adding sample paid features for Alex Claw...');
    
    const insertFeature = db.prepare(`
      INSERT INTO paid_features (agent_id, feature_type, status, expires_at, price_usdc, tx_hash)
      VALUES (?, ?, 'active', ?, ?, ?)
    `);
    
    // Verified badge for 1 year
    insertFeature.run(
      alexAgent.id,
      'verified_badge',
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      50.00,
      '0x' + Math.random().toString(16).substring(2)
    );
    
    // Featured listing for 3 months
    insertFeature.run(
      alexAgent.id,
      'featured_listing',
      new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      75.00,
      '0x' + Math.random().toString(16).substring(2)
    );
    
    console.log('Sample data added!');
  }
  
} else {
  console.log('Table already exists');
}

db.close();
console.log('Migration completed!');