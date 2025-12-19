// // server.js
// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import connectDB from "./config/db.js";
// import leaPreviewRoutes from "./routes/lea_preview_routes.js";
// import livekitRoutes from "./routes/livekitRoutes.js";
// import recordingsRoutes from "./routes/recordingsRoutes.js"; // <-- add

// dotenv.config();
// connectDB();

// const app = express();

// app.use(express.json({ limit: "100mb" }));
// app.use(
//     cors({
//         origin: "http://localhost:3000",
//         credentials: true,
//     })
// );

// app.get("/", (req, res) => res.send("API is running..."));

// app.use("/api/lea-preview", leaPreviewRoutes);
// app.use("/api/livekit", livekitRoutes);
// app.use("/api/recordings", recordingsRoutes); // <-- add

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));









// server.js
import 'dotenv/config'; // <-- load .env FIRST

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

// Routes
import leaPreviewRoutes from "./routes/lea_preview_routes.js";
import livekitRoutes from "./routes/livekitRoutes.js";
import recordingsRoutes from "./routes/recordingsRoutes.js";
import authRoutes from './routes/authroutes.js'
import userRoutes from './routes/userRoutes.js'
connectDB();

const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
    })
);

app.get("/", (req, res) => res.send("API is running..."));

// TEMP debug: remove in prod
app.get("/_env-check", (req, res) => {
    const val = (v) => (v ? "set" : "missing");
    res.json({
        AWS_REGION: process.env.AWS_REGION,
        S3_BUCKET: process.env.S3_BUCKET || "(missing)",
        S3_PREFIX: process.env.S3_PREFIX || "(empty)",
        AWS_ACCESS_KEY_ID: val(process.env.AWS_ACCESS_KEY_ID),
        AWS_SECRET_ACCESS_KEY: val(process.env.AWS_SECRET_ACCESS_KEY),
        S3_SSE: process.env.S3_SSE || "(none)",
        S3_SSE_KMS_KEY_ID: process.env.S3_SSE_KMS_KEY_ID ? "set" : "(none)",
    });
});

app.use("/api/lea-preview", leaPreviewRoutes);
app.use("/api/livekit", livekitRoutes);
app.use("/api/recordings", recordingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
