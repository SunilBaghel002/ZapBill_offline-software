const initSqlJs = require('./node_modules/sql.js/dist/sql-wasm.js');
const fs = require('fs');
const path = require('path');

const dbPath = 'c:/Users/lenovo/OneDrive/Documents/db/data/restaurant_pos.db';
const wasmPath = path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
const wasmBinary = fs.readFileSync(wasmPath);

async function test() {
  try {
    const SQL = await initSqlJs({ wasmBinary });
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    
    const query = "SELECT json_extract(variant, '$.name') as name FROM order_items WHERE variant IS NOT NULL LIMIT 5";
    const stmt = db.prepare(query);
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    
    console.log("SUCCESS:", JSON.stringify(result));
  } catch (err) {
    console.error("SQL_ERROR:", err.message);
  }
}

test();
