import app from "./app.js";
import mongoose from "mongoose";
import { envConfig } from "./config/env.config.js";

const PORT = envConfig.PORT;

app.listen(PORT, async () => {
  console.log(`🚀 Himalingo server running on port ${PORT}`);
  try {
    const dropIndexes = async () => {
      const collection = mongoose.connection.db.collection('translations');
      await collection.dropIndexes();
      console.log("✅ Database indexes cleared.");
    };
    if (mongoose.connection.readyState === 1) {
      await dropIndexes();
    } else {
      mongoose.connection.once('connected', dropIndexes);
    }
  } catch (e) {
    console.log("ℹ️ Database was already clean.");
  }
});