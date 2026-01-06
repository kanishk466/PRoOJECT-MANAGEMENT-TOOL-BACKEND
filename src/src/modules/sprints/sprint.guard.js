import prisma from "../../config/prisma.js";

export const ensureSprintIsActive = async (ticketId) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: Number(ticketId) },
    include: {
      sprint: true,
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  if (ticket.sprint && ticket.sprint.status === "COMPLETED") {
    throw new Error(
      "This sprint is completed. No further changes are allowed."
    );
  }

  return ticket;
};
