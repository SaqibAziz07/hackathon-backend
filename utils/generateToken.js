import jwt from "jsonwebtoken";

const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

export default generateToken;