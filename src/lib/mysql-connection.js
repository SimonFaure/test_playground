const mysql = require('mysql2/promise');

let connection = null;

const dbConfig = {
  host: '192.168.129.250',
  port: 3306,
  user: 'bob',
  password: 'WebMaster62',
  database: 'taghunter_playground'
};

async function connectToDatabase() {
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Successfully connected to MySQL database at', dbConfig.host);
    return { success: true, message: 'Database connection established' };
  } catch (error) {
    console.error('✗ Failed to connect to MySQL database:', error.message);
    return { success: false, message: error.message };
  }
}

async function getConnection() {
  if (!connection) {
    await connectToDatabase();
  }
  return connection;
}

async function closeConnection() {
  if (connection) {
    await connection.end();
    connection = null;
    console.log('Database connection closed');
  }
}

module.exports = {
  connectToDatabase,
  getConnection,
  closeConnection
};
