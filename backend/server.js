
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");


const app = express();
const httpServer = http.createServer(app);


let io = null;
try {
  const { Server } = require("socket.io");
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    socket.on("join-session", (sessionId) => {
      socket.join(sessionId);
    });
  });

  console.log("✅ Socket.IO initialised");
} catch {
  console.warn("⚠  socket.io not installed — real-time updates disabled");
}


app.use((req, _res, next) => {
  req.io = io;
  next();
});


app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "*",
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));


app.use("/api/auth", require("./routes/auth"));
app.use("/api/interview", require("./routes/interview"));
app.use("/api/resume", require("./routes/resume"));
app.use("/api/score", require("./routes/score"));


app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});


if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}



app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});


process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});
mongoose.connection.on("disconnected", () => {
  console.warn("⚠ MongoDB disconnected");
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   ENV: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
