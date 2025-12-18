import prisma from "../../config/prisma.js";
import { comparePassword } from "../../utils/password.js";
import { signToken } from "../../utils/jwt.js";

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};




export const getUsersService = async ({ role, requester }) => {
  // Developer not allowed
  if (requester.role === "DEVELOPER") {
    throw new Error("Access denied");
  }

  // Tester can only fetch developers
  if (requester.role === "TESTER" && role && role !== "DEVELOPER") {
    throw new Error("Access denied");
  }

  const where = {
    isActive: true,
  };

  if (role) {
    where.role = role;
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });
};

