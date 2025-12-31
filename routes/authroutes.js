import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
// import User from "../models/User.js";
// import { generateRefreshToken, generateSchedules } from "../utils/helpers.js";
import { checkUser, googleLogin, loginWithoutPassword, loginWithPassword, refreshTokenController, sendEmployerOTPemail } from "../controllers/authController.js";
import { registerUser, setPasswordAfterOtp, verifyEmail } from "../controllers/signUpController.js";

const authRouter = express.Router();

authRouter.post("/google-login", googleLogin);
authRouter.post("/check-user", checkUser);
authRouter.post("/login-no-password", loginWithoutPassword);
authRouter.post("/send-otp", sendEmployerOTPemail);
authRouter.post("/refresh-token", refreshTokenController);
authRouter.post("/login-password", loginWithPassword);

authRouter.post("/register", registerUser);
authRouter.put("/verify-email/:id", verifyEmail);
authRouter.post("/set-password", setPasswordAfterOtp);
export default authRouter;
