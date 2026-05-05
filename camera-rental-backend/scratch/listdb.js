require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const admin = mongoose.connection.db.admin();
  const result = await admin.listDatabases();
  console.log('\n📂 Danh sách Database trên cluster:');
  console.log('─────────────────────────────────');
  result.databases.forEach(db => {
    const sizeMB = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
    console.log(`  📁 ${db.name} (${sizeMB} MB)`);
  });
  process.exit(0);
}).catch(e => {
  console.error('Lỗi:', e.message);
  process.exit(1);
});
