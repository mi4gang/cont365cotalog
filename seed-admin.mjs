import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not provided!');
  console.error('Usage: node seed-admin.mjs "mysql://user:pass@host:port/db"');
  process.exit(1);
}

async function seedAdmin() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(DATABASE_URL);
    console.log('✅ Connected!');

    // Generate fresh bcrypt hash for "admin123"
    console.log('🔐 Generating password hash...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    console.log(`✅ Hash generated: ${passwordHash}`);

    // Delete existing admin
    console.log('🗑️  Removing existing admin...');
    await connection.execute(
      'DELETE FROM `admin_users` WHERE `username` = ?',
      ['admin']
    );
    console.log('✅ Existing admin removed');

    // Insert new admin with proper hash
    console.log('➕ Creating new admin...');
    await connection.execute(
      'INSERT INTO `admin_users` (`username`, `passwordHash`, `name`) VALUES (?, ?, ?)',
      ['admin', passwordHash, 'Administrator']
    );
    console.log('✅ Admin created successfully!');

    // Verify insertion
    console.log('🔍 Verifying...');
    const [rows] = await connection.execute(
      'SELECT `username`, LENGTH(`passwordHash`) as hash_length FROM `admin_users` WHERE `username` = ?',
      ['admin']
    );
    
    if (rows.length > 0) {
      console.log(`✅ Verified: username="${rows[0].username}", hash_length=${rows[0].hash_length}`);
      console.log('\n🎉 SUCCESS! You can now login with:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    } else {
      console.error('❌ Verification failed: admin not found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

seedAdmin();
