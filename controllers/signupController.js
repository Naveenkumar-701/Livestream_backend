import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sgMail from "@sendgrid/mail";
// import { validationResult } from "express-validator";
import User from "../models/Users.js";
import { generateRefreshToken } from "../utils/helpers.js";

export const registerUser = async (req, res) => {
    try {
        // const errors = validationResult(req);
        // if (!errors.isEmpty()) {
        //   return res.status(400).json({ errors: errors.array() });
        // }

        const {
            firstName,
            lastName,
            email,
            phone,
            password,
            recrootUserType = "Candidate",
            countryDetails,
        } = req.body;

        // Check if user already exists (and not temp)
        const userExist = await User.findOne({ email });
        if (
            userExist &&
            userExist.recrootUserType !== "tempStudent" &&
            userExist.email_is_verified
        ) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Generate OTP
        const referral_code = Math.floor(1000 + Math.random() * 9000).toString();

        let user;
        if (userExist && userExist.recrootUserType === "tempStudent") {
            // Update existing temp user
            user = await User.findByIdAndUpdate(
                userExist._id,
                {
                    firstName,
                    lastName,
                    phone,
                    password,
                    recrootUserType: "Candidate",
                    countryDetails,
                    referral_code,
                    email_is_verified: false,
                },
                { new: true }
            );
        } else {
            // Create new user WITHOUT password
            user = await User.create({
                id: Date.now().toString(),
                firstName,
                lastName,
                email,
                phone,
                recrootUserType,
                countryDetails: countryDetails || { country: "India", dialCode: "+91" },
                email_is_verified: false,
                referral_code,
                password,
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { user_id: user._id, email },
            process.env.TOKEN_KEY,
            { expiresIn: "24h" }
        );

        // Send OTP Email
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
            to: email,
            from: {
                name: "Recroot Account",
                email: "recroot-account@recroot.io",
            },
            subject: "Recroot Verification Code",
            text: `Hi ${firstName}, your OTP is ${referral_code}`,
            html: `
        <div style="font-family: Helvetica,Arial,sans-serif;line-height:2">
          <div style="margin:40px auto;width:70%;padding:20px 0">
            <p style="font-size:1.1em">Hi ${firstName},</p>
            <p>Thank you for joining Recroot!</p>
            <p>Please use this OTP to verify your email:</p>
            <h2 style="background:#00466A;color:#fff;padding:12px;border-radius:4px;display:inline-block;">
              ${referral_code}
            </h2>
            <p style="font-size:0.9em">Regards,<br/>Recroot Team</p>
          </div>
        </div>
      `,
        };

        await sgMail.send(msg);

        return res.status(200).json({
            message: "OTP sent successfully",
            User: user,
            token,
            referral_code,
            userID: user._id,
        });
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { code } = req.body;
        console.log('code', code)
        // if (!code || !id) {
        //   return res.status(400).json({
        //     message: 'Invalid request data',
        //   });
        // }

        const user = await User.findByIdAndUpdate(
            id,
            { email_is_verified: true },
            { new: true }
        );
console.log('user', user)
        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }
        const payload = {
            _id: user._id,
            email: user.email,
            role: user.recrootUserType,
        };

        const token = jwt.sign(
            { user: payload },
            process.env.TOKEN_KEY,
            { expiresIn: "24h" }
        );

        const refreshToken = generateRefreshToken(user);

        // 5️⃣ Update user
        user.refreshToken = refreshToken;
        user.method = "local";

        await user.save();
        res.status(200).json({
            message: 'Email verified successfully',
            User:user,
            token,
            refreshToken,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
        });
    }

};

export const setPasswordAfterOtp = async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;

        if (!email || !password || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.email_is_verified) {
            return res.status(400).json({ message: "Please verify OTP first" });
        }

        // Now hash and set password
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        // After saving the password
        const token = jwt.sign(
            { user_id: user._id, email: user.email },
            process.env.TOKEN_KEY,
            { expiresIn: "7d" } // or same as your login expiry
        );

        return res.json({
            message: "Password set successfully. Logged in automatically!",
            token,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                recrootUserType: user.recrootUserType,
                phone: user.phone,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to set password" });
    }
};