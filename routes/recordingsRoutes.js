// // routes/recordingsRoutes.js
// import express from "express";
// import multer from "multer";
// import { uploadRecording } from "../controllers/recordings_controller.js";

// const router = express.Router();

// const upload = multer({
//     storage: multer.memoryStorage(),
//     limits: { fileSize: 1024 * 1024 * 1024 }, // up to 1GB; careful with RAM!
// });

// router.post("/upload", upload.single("file"), uploadRecording);

// export default router;



import express from "express";
import { getPlaylistUrl } from "../controllers/recordings_controller.js";
const router = express.Router();

router.get("/playlist/:room", getPlaylistUrl);

export default router;
