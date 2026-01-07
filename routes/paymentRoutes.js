import express from "express";
import { createPaymentIntent, getPaymentByTransactionId } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-payment-intent", createPaymentIntent);

router.get("/payment/:transactionId", getPaymentByTransactionId);

export default router;


// import express from "express";
// import {
//   createPaymentIntent,
//   getPaymentByTransactionId,
// } from "../controllers/paymentController.js";

// const router = express.Router();

// router.post("/create-payment-intent", createPaymentIntent);
// router.get("/payment/:transactionId", getPaymentByTransactionId);

// export default router;
