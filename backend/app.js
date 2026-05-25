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

app.use("/api/admin", adminRoutes);

app.use("/api/auth", authRoutes);
app.use("/api", authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/chat", chatRoutes);


app.route("/health").get((req, res) => {
  return res.status(200)
            .json({
              success: true,
              health: "GOOD",
              message: "System is running GOOD"
            })
})

app.use((err, req, res, next) => {
    console.error(err.stack); // Good for debugging
    
    res.status(500).json({ 
        success: false, 
        message: err.message || "Internal Server Error" 
    });
});

export default app;
