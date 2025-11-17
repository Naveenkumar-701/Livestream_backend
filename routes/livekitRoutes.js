

import express from "express";
import { issueJoinToken, startEgress, stopEgress } from "../controllers/livekit_controller.js";
const router = express.Router();

router.post("/token", issueJoinToken);
router.post("/egress/start", startEgress);
router.post("/egress/stop", stopEgress);

export default router;




// // routes/livekitRoutes.js
// import express from "express";
// import {
//     issueJoinToken,
//     startEgress,
//     stopEgress,
// } from "../controllers/livekit_controller.js";

// const router = express.Router();

// router.post("/token", issueJoinToken);
// router.post("/egress/start", startEgress);
// router.post("/egress/stop", stopEgress);

// export default router;
