// import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const createPaymentIntent = async (req, res) => {
//   try {
//     // 1️⃣ Create price (temporary – OK for now)
//     const price = await stripe.prices.create({
//       product: process.env.PRODUCT_ID,
//       unit_amount: 9900,
//       currency: "usd",
//     });

//     // 2️⃣ Create PaymentIntent
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: price.unit_amount,
//       currency: price.currency,
//       automatic_payment_methods: {
//         enabled: true,
//       },
//       metadata: {
//         productId: process.env.PRODUCT_ID,
//         email: req.body.email,
//         userId: req.body.userId
//       },
//     });

//     console.log("🟢 PAYMENT INTENT ID:", paymentIntent.id);
//     console.log("📧 EMAIL RECEIVED:", req.body.email);

//     // ✅ RETURN REAL TRANSACTION DATA
//     res.status(200).json({
//       clientSecret: paymentIntent.client_secret,
//       paymentIntentId: paymentIntent.id,
//       createdAt: paymentIntent.created, // unix timestamp
//     });

//   } catch (error) {
//     console.error("Stripe Error:", error.message);
//     res.status(500).json({ message: error.message });
//   }
// };



// import Stripe from "stripe";
// import PaymentDetails from "../models/paymentdetails.js";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// /* =====================================================
//    CREATE / UPDATE PAYMENT
// ===================================================== */
// export const createPaymentIntent = async (req, res) => {
//   try {
//     const { email, userId, transactionId, status } = req.body;

//     /* 🔁 UPDATE MODE */
//     if (transactionId && status) {
//       const payment = await PaymentDetails.findOneAndUpdate(
//         { transactionId },
//         {
//           status,
//           paidAt: status === "success" ? new Date() : null,
//         },
//         { new: true }
//       );

//       return res.status(200).json({ payment });
//     }

//     /* 🆕 CREATE MODE */
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: 1180 * 100, // ₹1180
//       currency: "inr",
//       automatic_payment_methods: { enabled: true },
//       metadata: { email, userId },
//     });

//     const payment = await PaymentDetails.create({
//       userId,
//       email,
//       transactionId: paymentIntent.id,
//       stripePaymentIntentId: paymentIntent.id,
//       amount: 1180,
//       currency: "INR",
//       status: "created",
//       paidAt: new Date(paymentIntent.created * 1000),
//     });

//     res.status(200).json({
//       clientSecret: paymentIntent.client_secret,
//       transactionId: payment.transactionId,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// /* =====================================================
//    GET PAYMENT DETAILS
// ===================================================== */
// export const getPaymentByTransactionId = async (req, res) => {
//   try {
//     const payment = await PaymentDetails.findOne({
//       transactionId: req.params.transactionId,
//     });

//     if (!payment) {
//       return res.status(404).json({ message: "Payment not found" });
//     }

//     res.status(200).json({ payment });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


import Stripe from "stripe";
import PaymentDetails from "../models/paymentdetails.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async (req, res) => {
  try {
    const { email, userId, transactionId, status } = req.body;

    /* =====================================================
       🔁 UPDATE MODE (after payment result)
       SAME API – NO NEW FUNCTION
    ===================================================== */
    if (transactionId && status) {
      const payment = await PaymentDetails.findOneAndUpdate(
        { transactionId },
        {
          status,
          paidAt: status === "success" ? new Date() : null,
        },
        { new: true }
      );

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      return res.status(200).json({
        message: "Payment status updated",
        payment,
      });
    }

    /* =====================================================
       🆕 CREATE MODE (initial payment)
    ===================================================== */

    // 1️⃣ Create price (temporary – OK for testing)
    const price = await stripe.prices.create({
      product: process.env.PRODUCT_ID,
      unit_amount: 9900,
      currency: "usd",
    });

    // 2️⃣ Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount,
      currency: price.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        productId: process.env.PRODUCT_ID,
        email,
        userId,
      },
    });

    console.log("🟢 PAYMENT INTENT ID:", paymentIntent.id);
    console.log("📧 EMAIL RECEIVED:", email);

    // 3️⃣ SAVE PAYMENT (created)
    await PaymentDetails.create({
      userId,
      email,
      transactionId: paymentIntent.id,
      stripePaymentIntentId: paymentIntent.id,
      amount: price.unit_amount / 100,
      currency: price.currency.toUpperCase(),
      status: "created",
      paidAt: new Date(paymentIntent.created * 1000),
    });

    // 4️⃣ Return to frontend
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      createdAt: paymentIntent.created,
    });

  } catch (error) {
    console.error("Stripe Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getPaymentByTransactionId = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        message: "Transaction ID is required",
      });
    }

    const payment = await PaymentDetails.findOne({ transactionId });

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        transactionId: payment.transactionId,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        email: payment.email,
        plan: payment.plan,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      },
    });

  } catch (error) {
    console.error("GET PAYMENT ERROR:", error.message);
    res.status(500).json({
      message: "Server error",
    });
  }
};


