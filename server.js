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
import conductorRoutes from "./routes/conductors.route.js"; // 👈 NEW
import driverRoutes from "./routes/drivers.route.js";
import connectDB from "./utils/connectDB.js";
import stopPriceRoutes from "./routes/stopPrice.route.js"; // 👈 NEW
import pass from "./routes/pass.route.js"; // 👈 NEW
import gpsRoutes from "./routes/gps.route.js";
import fareRoutes from "./routes/fareRoutes.js";
import conductorBusRoutes from "./routes/conductorBus.route.js";
import reportRoutes from "./routes/reports.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import routeMasterRoutes from "./routes/routeMaster.route.js";
import stopMasterRoutes from "./routes/stopMaster.route.js";
import shiftRoutes from "./routes/shiftAssignment.route.js";
import { startDashboardEmitter } from "./services/socket.service.js";
import conductorAuthRoutes from "./routes/conductorAuth.route.js"; // 🆕 POS Issue App
import posIssueRoutes from "./routes/posIssue.route.js"; // 🆕 POS Issue App
import cashierCollectionRoutes from "./routes/cashierCollection.route.js"; // 💰 Cashier Collections
import busBreakdownRoutes from "./routes/busBreakdown.route.js"; // 🚌 Bus Breakdowns
import dailyReportRoutes from "./routes/dailyReport.route.js"; // 📊 Daily Report
import ticketRoutes from "./routes/ticket.route.js"; // 🎫 Ticket save with shift

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "https://smc-frontend-three.vercel.app",
  "https://smc-frontend-git-main-rudreshmathapatis-projects.vercel.app",
  "https://smc-frontend-mim6z9h2z-rudreshmathapatis-projects.vercel.app",
  "http://localhost:3000",
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ VERY IMPORTANT

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
app.use("/api/conductors", conductorRoutes); // 👈 NEW
app.use("/api/drivers", driverRoutes);
app.use("/api/stop-prices", stopPriceRoutes); // 👈 NEW
app.use("/api/passes", pass); // 👈 NEW
app.use("/api/gps", gpsRoutes);
app.use("/api/conductor-bus", conductorBusRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/route-master", routeMasterRoutes);
app.use("/api/stop-master", stopMasterRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/conductor-auth", conductorAuthRoutes); // 🆕 POS Issue App - Conductor login
app.use("/api/pos-issues", posIssueRoutes); // 🆕 POS Issue App - Issue management
app.use("/api/cashier-collections", cashierCollectionRoutes); // 💰 Cashier cash collection system
app.use("/api/bus-breakdowns", busBreakdownRoutes); // 🚌 Bus Breakdowns
app.use("/api/daily-report", dailyReportRoutes); // 📊 Daily Report
app.use("/api/tickets", ticketRoutes); // 🎫 Ticket save with shift

// 🛰️ Socket.IO Setup
const server = http.createServer(app);

// const io = new SocketServer(server, {
//     cors: {
//         origin: allowedOrigins,
//         methods: ["GET", "POST"],
//         credentials: true
//     },
// });
const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ["websocket", "polling"]
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// 🚀 Start Dashboard Emitter
startDashboardEmitter(io);

// 🚀 Start Server
server.listen(PORT, () => {
  connectDB();
  console.log(`🚀 Server running on port ${PORT}`);
});
