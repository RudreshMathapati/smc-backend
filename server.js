// // import express from "express";
// // import dotenv from "dotenv";
// // import cors from "cors";
// // import http from "http";
// // import cookieParser from "cookie-parser";
// // import { Server as SocketServer } from "socket.io";

// // import routeRoutes from "./routes/route.route.js";
// // import buses from "./routes/bus.route.js";
// // import userRoutes from "./routes/user.route.js";
// // import busRoutesMapping from "./routes/busRouteMapping.route.js";
// // import PosMachine from "./routes/pos.route.js";
// // import busPosMapping from "./routes/busPosMapping.route.js";
// // import authRoutes from "./routes/auth.route.js";
// // import connectDB from "./utils/connectDB.js";
// // // import gpsRoutes from "./routes/gps.route.js";
// // dotenv.config();

// // const app = express();
// // const PORT = process.env.PORT || 5000;
// // const corsOptions = {
// //   origin: "http://localhost:3000",
// //   optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
// //   credentials: true,
// // };

// // app.use(cookieParser());
// // app.use(cors(corsOptions));
// // app.use(express.json());

// // // 🔀 API Routes
// // app.use("/api/routes", routeRoutes);
// // app.use("/api/buses", buses);
// // app.use("/api/bus-routes-mapping", busRoutesMapping);
// // app.use("/api/users", userRoutes);
// // app.use("/api/pos-machines", PosMachine);
// // app.use("/api/bus-pos-mapping", busPosMapping);
// // app.use("/api/auth", authRoutes);
// // // app.use("/api/gps", gpsRoutes);

// // // 🛰️ Socket.IO Setup (without GPS simulation)
// // const server = http.createServer(app);

// // const io = new SocketServer(server, {
// //   cors: {
// //     origin: "*", // You can restrict this to specific domain later
// //     methods: ["GET", "POST"],
// //   },
// // });

// // io.on("connection", (socket) => {
// //   console.log("📡 Client connected to socket.io");

// //   socket.on("disconnect", () => {
// //     console.log("❌ Client disconnected");
// //   });
// // });

// // // 🚀 Start Server

// // server.listen(PORT, () => {
// //   connectDB();
// //   console.log(`🚀 Server running on port ${PORT}`);
// // });







// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import http from "http";
// import cookieParser from "cookie-parser";
// import { Server as SocketServer } from "socket.io";

// import routeRoutes from "./routes/route.route.js";
// import buses from "./routes/bus.route.js";
// import userRoutes from "./routes/user.route.js";
// import busRoutesMapping from "./routes/busRouteMapping.route.js";
// import PosMachine from "./routes/pos.route.js";
// import busPosMapping from "./routes/busPosMapping.route.js";
// import authRoutes from "./routes/auth.route.js";
// import conductorRoutes from "./routes/conductors.route.js"; // 👈 NEW
// import connectDB from "./utils/connectDB.js";
// import stopPriceRoutes from "./routes/stopPrice.route.js"; // 👈 NEW
// import pass from "./routes/pass.route.js"; // 👈 NEW
// import gpsRoutes from "./routes/gps.route.js";
// import fareRoutes from "./routes/fareRoutes.js";
// import conductorBusRoutes from "./routes/conductorBus.route.js";
// import reportRoutes from "./routes/reports.route.js";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// const allowedOrigins = [
//     process.env.FRONTEND_URL || "http://localhost:3000",
//     "http://localhost:3001",
// ];

// const corsOptions = {
//     origin: ["http://localhost:3000"],
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     credentials: true,
// };

// app.use(cors(corsOptions));
// app.options("*", cors(corsOptions)); // ✅ VERY IMPORTANT

// app.use(cookieParser());
// app.use(express.json());
// // 🔀 API Routes
// app.use("/api", fareRoutes);
// app.use("/api/routes", routeRoutes);
// app.use("/api/buses", buses);
// app.use("/api/bus-routes-mapping", busRoutesMapping);
// app.use("/api/users", userRoutes);
// app.use("/api/pos-machines", PosMachine);
// app.use("/api/bus-pos-mapping", busPosMapping);
// app.use("/api/auth", authRoutes);
// app.use("/api/conductors", conductorRoutes); // 👈 NEW
// app.use("/api/stop-prices", stopPriceRoutes); // 👈 NEW
// app.use("/api/passes", pass); // 👈 NEW
// app.use("/api/gps", gpsRoutes);
// app.use("/api/conductor-bus", conductorBusRoutes);
// app.use("/api/reports", reportRoutes);

// // 🛰️ Socket.IO Setup
// const server = http.createServer(app);

// const io = new SocketServer(server, {
//     cors: {
//         origin: "*", // You can restrict this to specific domain later
//         methods: ["GET", "POST"],
//     },
// });

// io.on("connection", (socket) => {
//     console.log("📡 Client connected to socket.io");
    
//     socket.on("disconnect", () => {
//         console.log("❌ Client disconnected");
//     });
// });
// app.get("/", (req, res) => {
//   res.send("SMC Backend API is running");
// });
// // 🚀 Start Server
// server.listen(PORT, () => {
//     connectDB();
//     console.log(`🚀 Server running on port ${PORT}`);
// });
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
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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

// 🛰️ Socket.IO Setup
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
});

io.on("connection", (socket) => {
  console.log("📡 Client connected to socket.io");

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected");
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