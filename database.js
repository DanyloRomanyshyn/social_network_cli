const { MongoClient } = require('mongodb');

const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);
const dbName = 'social_network';

async function connectToDatabase() {
  await client.connect();
  console.log('Connected to MongoDB');
  const db = client.db(dbName);
  return db;
}

module.exports = { connectToDatabase };
