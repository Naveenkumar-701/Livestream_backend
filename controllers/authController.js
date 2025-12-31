import jwt from "jsonwebtoken";
import Users from "../models/Users.js";
import { OAuth2Client } from "google-auth-library";
import sgMail from "@sendgrid/mail";
import { generateRefreshToken } from "../utils/helpers.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Google token is required" });
    }

    // 1️⃣ Verify Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    // 2️⃣ Check if user exists
    let user = await Users.findOne({ email });

    // ❌ Email exists but not Google account
    if (user && (!user.google || !user.google.id)) {
      return res.status(400).json({
        message:
          "This email is registered with password login. Please login using email & password.",
      });
    }

    // 3️⃣ Create user if not exists
    if (!user) {
      user = await Users.create({
        email,
        name,
        google: {
          id: sub,
          name,
          email,
        },
        method: "google",
        recrootUserType: "Candidate", // adjust if needed
        profileImage: picture,
      });
    }

    // 4️⃣ Create JWT (same format you already use)
    const jwtPayload = {
      _id: user._id,
      email: user.email,
      role: user.recrootUserType,
    };

    const accessToken = jwt.sign(
      { user: jwtPayload },
      process.env.TOKEN_KEY,
      { expiresIn: "24h" }
    );

    const refreshToken = generateRefreshToken(user);

    await Users.findByIdAndUpdate(user._id, { refreshToken });

    // 5️⃣ Response
    return res.status(200).json({
      User: user,
      token: accessToken,
      refreshToken,
      method: "google",
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    return res.status(500).json({ message: "Google authentication failed" });
  }
};

export const checkUser = async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await Users.findOne({
      email: email.toLowerCase(),
    }).lean();

    // ❌ User not found
    if (!existingUser) {
      return res.status(400).json({
        success: false,
        message:
          "No account found with this email. Please verify the email address and try again.",
      });
    }

    // ❌ Google login user
    if (existingUser.method === "google") {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google Sign-In. Please log in with Google to continue.",
      });
    }

    let updatedUser = existingUser;

    // ✅ Candidate / tempCandidate flow
    if (
      existingUser.recrootUserType === "tempCandidate" ||
      existingUser.recrootUserType === "Candidate"
    ) {
      const referralCode = Math.floor(1000 + Math.random() * 9000);

      updatedUser = await Users.findOneAndUpdate(
        { email: email.toLowerCase() },
        { $set: { referral_code: referralCode } },
        { new: true }
      ).lean();

      if (!updatedUser) {
        return res.status(400).json({
          success: false,
          message: "User not found or unable to update user details.",
        });
      }

      const body = {
        _id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.recrootUserType,
      };

      const token = jwt.sign(
        { user: body },
        process.env.TOKEN_KEY,
        { expiresIn: "24h" }
      );

      const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully to your email.",
        updatedUser,
        token,
        expiresAt,
      });
    }

    // ✅ Existing user but no OTP flow
    return res.status(200).json({
      success: true,
      message: "User verified successfully.",
      existingUser,
    });

  } catch (error) {
    console.error(`Error occurred: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const loginController = async (req, res, next) => {
  console.log("--------------- app post auth login  1");

  passport.authenticate("login", async (err, user, info) => {
    console.log("--------------- app post auth login  2");

    try {
      if (err || !user) {
        return res
          .status(500)
          .json({ message: "Please check your Email and Password" });
      }

      const userDetails = await Users.findById(user?._id);

      if (
        userDetails &&
        userDetails.archiveStatus &&
        userDetails.userInvitationStatus === "removed"
      ) {
        return res
          .status(500)
          .json({ message: "Your account has been de activated by Admin" });
      }

      req.login(user, { session: false }, async (error) => {
        if (error) return next(error);

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

        await Users.findByIdAndUpdate(user._id, {
          refreshToken,
        });

        // Create availability if not added
        if (
          user &&
          !user.isAvailabilityAdded &&
          (user.memberType !== "Candidate" &&
            user.memberType !== "tempCandidate")
        ) {
          const schedules = generateSchedules();

          const availability = await Availability.create({
            userId: user._id,
            schedules,
          });

          await Users.findByIdAndUpdate(user._id, {
            availabilityId: availability._id,
            isAvailabilityAdded: true,
          });
        }

        const updatedUser = await Users.findById(user._id);

        return res.json({
          User: updatedUser,
          token,
          refreshToken,
        });
      });
    } catch (error) {
      console.log("login error", error);
      return next(error);
    }
  })(req, res, next);
};

export const loginWithoutPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const userDetails = await Users.findOne({
      email: email,
      recrootUserType: { $in: ["tempCandidate", "Candidate"] },
    });

    if (userDetails && userDetails.recrootUserType === "tempCandidate") {
      userDetails.recrootUserType = "Candidate";
      await userDetails.save();
    }

    if (!userDetails) {
      return res.status(404).json({ message: "User not found" });
    }

    const body = {
      _id: userDetails._id,
      email: userDetails.email,
      role: userDetails.recrootUserType,
    };
    console.log('body', body)
    const token = jwt.sign({ user: body }, process.env.TOKEN_KEY, {
      expiresIn: "24h",
    });
    const refreshToken = generateRefreshToken(userDetails);
    console.log('userDetails._id', userDetails._id)
    await Users.findByIdAndUpdate(userDetails._id, {
      refreshToken,
    });
    const updatedUser = await Users.findById(userDetails._id);
    return res.status(200).json({
      verify: true,
      User: updatedUser,
      token,
      refreshToken,
    });

  } catch (error) {
    console.error("loginWithoutPassword error:", error);
    return res.status(500).send(error);
  }
};

export const sendEmployerOTPemail = async (req, res) => {
  const { firstName, referral_code, email, delete: isDeleteRequest } = req.body;

  console.log(firstName, "firstName");

  if (!firstName || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const templateId = isDeleteRequest
      ? "d-5d82c3ab556e417ba12192467f06f371"
      : "d-c4c60c3867c6410ca8e0c9f760974a88";

    const msg = {
      to: 'srimidha@arinnovate.io',
      from: {
        name: "Recroot Account",
        email: "recroot-account@recroot.io",
      },
      templateId: templateId,
      dynamic_template_data: {
        employerName: firstName,
        code: referral_code,
      },
    };

    await sgMail.send(msg);
    console.log("Email Sent Successfully");

    return res.status(200).json({
      success: true,
      message: "OTP email sent successfully",
    });
  } catch (error) {
    console.error("Error sending email:", error);

    if (error.response) {
      console.error("SendGrid error response:", error.response.body);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP email",
    });

  }
};

export const refreshTokenController = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  const user = await Users.findOne({ refreshToken });

  if (!user) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }

  const payload = {
    _id: user._id,
    email: user.email,
    role: user.recrootUserType,
  };

  // 🔑 NEW ACCESS TOKEN
  const newAccessToken = jwt.sign(
    { user: payload },
    process.env.TOKEN_KEY,
    { expiresIn: "2d" }
  );

  // 🔄 ROTATE REFRESH TOKEN (THIS WAS MISSING)
  const newRefreshToken = generateRefreshToken(user);

  await Users.findByIdAndUpdate(user._id, {
    refreshToken: newRefreshToken,
  });

  // ✅ SEND BOTH TOKENS
  return res.json({
    token: newAccessToken,
    refreshToken: newRefreshToken,
  });
};

export const loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2️⃣ Find user
    const user = await Users.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Your email id is invalid",
      });
    }

    // ❌ Google-only account
    if (user.method === "google" || user.google?.id) {
      return res.status(400).json({
        message:
          "This account uses Google Sign-In. Please login with Google.",
      });
    }

    // ❌ Password not set
    if (!user.password) {
      return res.status(400).json({
        message: "Password not set. Please use Forgot Password.",
      });
    }

    // 3️⃣ Verify password
    const isMatch = await user.isValidPassword(password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // // ❌ Deactivated user
    // if (user.archiveStatus && user.userInvitationStatus === "removed") {
    //   return res.status(403).json({
    //     message: "Your account has been deactivated by Admin",
    //   });
    // }

    // 4️⃣ JWT Payload
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
    user.lastLogin = new Date();
    user.method = "local";

    await user.save();

    // 6️⃣ Response
    return res.status(200).json({
      User: user,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Password Login Error:", error);
    return res.status(500).json({
      message: "Login failed",
    });
  }
};