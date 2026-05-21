import express from "express";
import cors from "cors";
import "./config/db.js";
import "./config/pinecone.js";
import authRoutes from "./routes/auth.js";
import translateRoutes from "./routes/translate.js";
import chatRoutes from "./routes/chat.js";
import historyRoutes from "./routes/history.js";
import adminRoutes from "./routes/admin.js";

const app = express();

app.use(cors({
  origin: ["https://www.himalingo.com", "https://himalingo.com", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));

app.use(express.json());

app.use("/admin", adminRoutes);
app.use("/api", authRoutes);
app.use("/history", historyRoutes);
app.use("/", translateRoutes);
app.use("/", chatRoutes);

export default app;
