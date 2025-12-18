import prisma from "../../config/prisma.js";

export const generateTicketNumber = async () => {
  const count = await prisma.ticket.count();
  return `TKT-${1000 + count + 1}`;
};
