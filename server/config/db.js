import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/running-territory';
    console.log(`Connecting to MongoDB at ${connStr}...`);
    
    // Set connection timeout to 3 seconds for quick fallback
    await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.warn(`Primary MongoDB connection failed (${error.message}). Starting in-memory MongoDB fallback...`);
    try {
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log(`In-memory MongoDB Connected successfully at: ${uri}`);
    } catch (memErr) {
      console.error(`MongoDB connection error: ${memErr.message}`);
      process.exit(1);
    }
  }
};
