import asyncHandler from "express-async-handler";
import { verifyToken } from "../utils/jwt.js";
import prisma from "../config/prisma.js";

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Authorization token missing");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401);
      throw new Error("User not authorized");
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    res.status(401);
    throw new Error("Invalid or expired token");
  }
});

export default authMiddleware;
