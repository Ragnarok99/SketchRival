import { MongoClient, Db } from 'mongodb';
import { MONGODB_URI, DB_NAME } from '../config/database';

let db: Db;

export const connectToDatabase = async () => {
  if (db) {
    return db;
  }

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Successfully connected to database');
    return db;
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase first.');
  }
  return db;
};
