import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
// import User from "../models/User.js";
// import { generateRefreshToken, generateSchedules } from "../utils/helpers.js";
import { checkUser, loginWithoutPassword, sendEmployerOTPemail } from "../controllers/authController.js";
import { registerUser, setPasswordAfterOtp, verifyOtp } from "../controllers/signupController.js";

const authRouter = express.Router();

authRouter.post("/check-user", checkUser);
authRouter.post("/login-no-password", loginWithoutPassword);
authRouter.post("/send-otp", sendEmployerOTPemail);
authRouter.post("/register", registerUser);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/set-password", setPasswordAfterOtp);
export default authRouter;
