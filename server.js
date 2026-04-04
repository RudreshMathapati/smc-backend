import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";
import { Server as SocketServer } from "socket.io";

import routeRoutes from "./routes/route.route.js";
import buses from "./routes/bus.route.js";
import userRoutes from "./routes/user.route.js";
import busRoutesMapping from "./routes/busRouteMapping.route.js";
import PosMachine from "./routes/pos.route.js";
import busPosMapping from "./routes/busPosMapping.route.js";
import authRoutes from "./routes/auth.route.js";
import conductorRoutes from "./routes/conductors.route.js";
import connectDB from "./utils/connectDB.js";
import stopPriceRoutes from "./routes/stopPrice.route.js";
import pass from "./routes/pass.route.js";
import gpsRoutes from "./routes/gps.route.js";
import fareRoutes from "./routes/fareRoutes.js";
import conductorBusRoutes from "./routes/conductorBus.route.js";
import reportRoutes from "./routes/reports.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Allowed Origins (Local + Vercel)
const allowedOrigins = [
  "http://localhost:3000",
  "https://smc-frontend-three.vercel.app",
  "https://smc-frontend-git-main-rudreshmathapatis-projects.vercel.app",
  "https://smc-frontend-mim6z9h2z-rudreshmathapatis-projects.vercel.app"
];

// ✅ CORS Setup
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(null, true);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.options("*", cors());

app.use(cookieParser());
app.use(express.json());

// 🔀 API Routes
app.use("/api", fareRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/buses", buses);
app.use("/api/bus-routes-mapping", busRoutesMapping);
app.use("/api/users", userRoutes);
app.use("/api/pos-machines", PosMachine);
app.use("/api/bus-pos-mapping", busPosMapping);
app.use("/api/auth", authRoutes);
app.use("/api/conductors", conductorRoutes);
app.use("/api/stop-prices", stopPriceRoutes);
app.use("/api/passes", pass);
app.use("/api/gps", gpsRoutes);
app.use("/api/conductor-bus", conductorBusRoutes);
app.use("/api/reports", reportRoutes);



// 🛰️ Create HTTP server
const server = http.createServer(app);

// 🛰️ Socket.IO Setup
const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
});

io.on("connection", (socket) => {
  console.log("📡 Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Home route
app.get("/", (req, res) => {
  res.send("SMC Backend API is running");
});

// 🚀 Start Server
server.listen(PORT, () => {
  connectDB();
  console.log(`🚀 Server running on port ${PORT}`);
});