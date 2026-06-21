import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI not set — user profile sync disabled; set it in .env to enable MongoDB.");
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected : ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error :", error.message);
    console.warn("Server continues without database — /api/user/profile will return 503.");
  }
};

export default connectDB;