import jwt from "jsonwebtoken";

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1]; // Bearer <token>

    const decoded = jwt.verify(token, process.env.TOKEN_KEY);

    req.user = decoded.user; // attach user info
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Auth failed",
      error: err.message,
    });
  }
};

export default verifyToken;
