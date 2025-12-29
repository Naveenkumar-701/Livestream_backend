import express from "express";
import {
    issueJoinToken,
    issueJoinTokenGET,
    startEgress,
    startEgressGET,
    stopEgress,
    stopEgressGET,
    listRecordingsByRoomGET
} from "../controllers/livekit_controller.js";

const router = express.Router();

// POST routes
router.post("/token", issueJoinToken);
router.post("/egress/start", startEgress);
router.post("/egress/stop", stopEgress);

// GET routes
router.get("/token", issueJoinTokenGET);
router.get("/egress/start", startEgressGET);
router.get("/egress/stop", stopEgressGET);
router.get("/list-recordings", listRecordingsByRoomGET);

export default router;

