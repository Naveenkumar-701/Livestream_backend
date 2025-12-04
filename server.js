// server.js
import 'dotenv/config'; // <-- load .env FIRST

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";


// Routes

import livekitRoutes from "./routes/livekitRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";


connectDB();

const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "https://livestream-alpha-eight.vercel.app"
        ],
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


app.use("/api/livekit", livekitRoutes);
app.use("/api/interview",interviewRoutes);



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
