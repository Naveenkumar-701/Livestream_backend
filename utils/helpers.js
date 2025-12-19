import jwt from "jsonwebtoken";

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { _id: user._id },
    process.env.REFRESH_TOKEN_KEY,
    { expiresIn: "30d" }
  );
};