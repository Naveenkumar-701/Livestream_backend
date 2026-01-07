import PaymentPlan from "../models/PaymentPlans.js";

export const getPaymentPlans = async (req, res) => {
  try {
    const paymentPlan = await PaymentPlan.findOne({ isActive: true }).lean();

    if (!paymentPlan) {
      return res.status(404).json({
        success: false,
        message: "Payment plans not found",
      });
    }

    const activePlans = paymentPlan.plans
      .filter(plan => plan.isActive)
      .sort((a, b) => a.order - b.order);

    res.status(200).json({
      success: true,
      modules: paymentPlan.modules,
      plans: activePlans,
    });
  } catch (error) {
    console.error("Get Payment Plans Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   CREATE / UPDATE PAYMENT PLAN
========================= */
export const upsertPaymentPlan = async (req, res) => {
  try {
    const { name, modules, plans } = req.body;

    if (!plans || !Array.isArray(plans)) {
      return res.status(400).json({
        success: false,
        message: "Plans array is required",
      });
    }

    const existingPlan = await PaymentPlan.findOne();

    let result;

    if (existingPlan) {
      existingPlan.name = name || existingPlan.name;
      existingPlan.modules = modules || existingPlan.modules;
      existingPlan.plans = plans;

      result = await existingPlan.save();
    } else {
      result = await PaymentPlan.create({
        name,
        modules,
        plans,
      });
    }

    res.status(201).json({
      success: true,
      message: "Payment plan saved successfully",
      data: result,
    });
  } catch (error) {
    console.error("Upsert Payment Plan Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
