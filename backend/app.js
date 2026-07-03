import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; 
import "./config/db.js";
import "./config/pinecone.js";
import authRoutes from "./routes/auth.js";
import translateRoutes from "./routes/translate.js";
import historyRoutes from "./routes/history.js";
import adminRoutes from "./routes/admin.js";
import { auth } from "./middlewares/auth.middleware.js";

const app = express();

app.use(cors({
  origin: ["https://www.himalingo.com", "https://himalingo.com", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));

app.use(express.json());
app.use(cookieParser()); // ADD THIS — must come before routes that use req.cookies

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/history", auth, historyRoutes);
app.use("/api/translate", auth, translateRoutes);

app.route("/health").get((req, res) => {
  return res.status(200).json({
    success: true,
    health: "GOOD",
    message: "System is running GOOD"
  });
});

app.get("/api/test-me", (req, res) => {
  return res.json({ message: "Yes, app.js is live and updating!" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

export default app;