// import mongoose from "mongoose";

// const PlanSchema = new mongoose.Schema(
//   {
//     planKey: {
//       type: String, // free | pro
//       required: true,
//     },

//     name: {
//       type: String,
//       required: true,
//     },

//     price: {
//       usd: String,
//       aus: String,
//     },

//     priceId: {
//       usd: String,
//       aus: String,
//     },

//     isCustom: {
//       type: Boolean,
//       default: false,
//     },

//     isActive: {
//       type: Boolean,
//       default: true,
//     },

//     features: {
//       type: [String],
//       default: [],
//     },

//     order: Number,
//     details: String,
//   },
//   { _id: false }
// );

// const PaymentPlanSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       default: "Payment Plans",
//     },

//     modules: {
//       number_of_interviews: {
//         type: Number,
//         default: 0,
//       },
//     },

//     plans: [PlanSchema],

//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   { timestamps: true }
// );

// const PaymentPlan = mongoose.model("paymentplan", PaymentPlanSchema);

// export default PaymentPlan;


import mongoose from "mongoose";

const PlanSchema = new mongoose.Schema(
  {
    planKey: {
      type: String, // free | pro
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    price: {
      usd: String,
      aus: String,
    },

    priceId: {
      usd: String,
      aus: String,
    },

    isCustom: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    features: {
      type: [String],
      default: [],
    },

    order: Number,
    details: String,

    /* ✅ PLAN TYPE */
    type: {
      type: String,
      enum: ["candidate"],
      default: "candidate",
    },

    /* ✅ FREE PLAN END DATE */
    endsAt: {
      type: Date,
      default: null,
    },

    /* ✅ PRO PLAN RENEW DATE */
    renewAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const PaymentPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Payment Plans",
    },

    modules: {
      number_of_interviews: {
        type: Number,
        default: 0,
      },
    },

    plans: [PlanSchema],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const PaymentPlan = mongoose.model("paymentplan", PaymentPlanSchema);

export default PaymentPlan;
