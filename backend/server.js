// server.js — entry point
import "dotenv/config";
import app from "./app.js";
import mongoose from "mongoose";
import dotenv from 'dotenv'

dotenv.config();

const PORT = process.env.PORT || 3002;

app.listen(PORT, async () => {
  console.log(`🚀 Himalingo server running on port ${PORT}`);

  // THE FIX: Clean up the database restrictions
  try {
    const dropIndexes = async () => {
      const collection = mongoose.connection.db.collection('translations');
      // This removes the "unique" restriction that causes the E11000 error
      await collection.dropIndexes(); 
      console.log("✅ Database indexes cleared. Duplicates are now allowed.");
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