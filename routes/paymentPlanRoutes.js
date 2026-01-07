import express from "express";
import { getPaymentPlans, upsertPaymentPlan } from "../controllers/paymentplanController.js";

const planRouter = express.Router();

/* =========================
   PAYMENT PLAN ROUTES
========================= */

planRouter.get("/plans", getPaymentPlans);
planRouter.post("/add-plans", upsertPaymentPlan);

export default planRouter;
