import mongoose from "mongoose";

const paymentDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    transactionId: {
      type: String,
      required: true,
      unique: true,
    },

    stripePaymentIntentId: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    plan: {
      type: String,
      default: "PRO",
    },

    amount: {
      type: Number, // 99.00
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    status: {
      type: String,
      enum: ["created", "success", "failed"],
      default: "created",
    },

    paymentMethod: {
      type: String,
      default: "card",
    },

    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PaymentDetails", paymentDetailsSchema);


// import mongoose from "mongoose";

// const paymentDetailsSchema = new mongoose.Schema(
//   {
//     userId: { type: mongoose.Schema.Types.ObjectId, required: true },
//     email: String,

//     transactionId: { type: String, unique: true },
//     stripePaymentIntentId: String,

//     amount: Number,
//     currency: String,

//     status: {
//       type: String,
//       enum: ["created", "success", "failed"],
//       default: "created",
//     },

//     paidAt: Date,
//   },
//   { timestamps: true }
// );

// export default mongoose.model("PaymentDetails", paymentDetailsSchema);
