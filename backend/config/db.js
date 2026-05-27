// config/db.js — MongoDB connection
// Imported once in app.js, connects automatically

import mongoose from "mongoose";
import { envConfig } from "./env.config.js";

mongoose
  .connect(envConfig.MONGODB_URI)
  .then((config) => {
    console.log("Connection Host", config.connection.host)
    console.log("Connected to: " ,config.connection.db.databaseName, "database")
  })
  .catch((err) => console.error("MongoDB error:", err.message));