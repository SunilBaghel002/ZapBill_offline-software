const SQL = require('sql.js');
const fs = require('fs');

SQL().then(sql => {
  const buf = fs.readFileSync('c:/Users/lenovo/AppData/Roaming/restaurant-pos/restaurant_pos.db');
  const db = new sql.Database(buf);
  const res = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'");
  console.log(res[0].values[0][0]);
});
