// app.js — Express app setup
import express from "express";
import cors    from "cors";

import "./config/db.js";
import "./config/pinecone.js";

import authRoutes      from "./routes/auth.js";
import translateRoutes from "./routes/translate.js";
import chatRoutes      from "./routes/chat.js";
import historyRoutes   from "./routes/history.js";
import adminRoutes     from "./routes/admin.js";

const app = express();

// ── CORS fix — allow frontend on port 3000 ────────────────────────────────
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "https://www.himalingo.com", "https://himalingo.com"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/admin",   adminRoutes);
app.use("/api",     authRoutes);
app.use("/history", historyRoutes);
app.use("/",        translateRoutes);
app.use("/",        chatRoutes);

export default app;
