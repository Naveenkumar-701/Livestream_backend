import express from "express";
import { getInterviewQuestions, generateAIFollowUp } from "../controllers/interviewController.js";

const router = express.Router();

router.get("/questions/:id", getInterviewQuestions);
router.post("/generate-followup", generateAIFollowUp);

export default router;
