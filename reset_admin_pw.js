// Quick one-time script to reset the admin password in the DB to 'admin123'
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(
  process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
  'restaurant-pos'
);

// Try known paths
const possiblePaths = [
  'C:\\Users\\lenovo\\OneDrive\\Documents\\db\\data\\restaurant_pos.db',
  path.join(DB_PATH, 'restaurant_pos.db'),
];

async function main() {
  const newPassword = 'admin123';
  const hash = await bcrypt.hash(newPassword, 10);
  console.log('New hash for admin123:', hash);
  
  const SQL = await initSqlJs();
  
  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      console.log('Found DB at:', dbPath);
      const buffer = fs.readFileSync(dbPath);
      const db = new SQL.Database(buffer);
      
      // Check current admin user
      const users = db.exec("SELECT id, username, password_hash FROM users WHERE username = 'admin' AND is_deleted = 0");
      if (users.length > 0 && users[0].values.length > 0) {
        const currentHash = users[0].values[0][2];
        console.log('Current hash:', currentHash);
        
        // Update the password
        db.run("UPDATE users SET password_hash = ? WHERE username = 'admin' AND is_deleted = 0", [hash]);
        
        // Save
        const data = db.export();
        const outBuffer = Buffer.from(data);
        fs.writeFileSync(dbPath, outBuffer);
        
        console.log('✅ Admin password reset to: admin123');
        console.log('You can now login with admin / admin123');
      } else {
        console.log('No admin user found in this database');
      }
      
      db.close();
      return;
    }
  }
  
  console.log('❌ Database not found at any expected path');
  console.log('Checked:', possiblePaths);
}

main().catch(console.error);
