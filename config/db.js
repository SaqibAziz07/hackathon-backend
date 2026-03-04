import mongoose from "mongoose";

const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        minPoolSize: 2,
      });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      retries++;
      console.error(`❌ MongoDB connect attempt ${retries}/${maxRetries} failed:`, err.message);
      if (retries === maxRetries) {
        console.error("Giving up. Exiting...");
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 3000 * retries)); // Exponential backoff
    }
  }
};

export default connectDB;