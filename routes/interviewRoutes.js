import express from "express";
import { getInterviewQuestions, generateAIFollowUp, finalizeInterview, updateInterviewStatus, saveInterviewEvent } from "../controllers/interviewController.js";

const router = express.Router();

router.get("/questions/:id", getInterviewQuestions);
router.post("/generate-followup", generateAIFollowUp);
router.post("/finalize", finalizeInterview);
router.post("/update-status", updateInterviewStatus);
router.post("/interruption", saveInterviewEvent);


export default router;
