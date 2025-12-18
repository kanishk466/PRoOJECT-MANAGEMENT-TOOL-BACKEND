import prisma from "../../config/prisma.js";

import { generateTicketNumber } from "../tickets/ticket.utils.js";

export const createSprintService = async ({ data, user }) => {
  return prisma.sprint.create({
    data: {
      ...data,
      createdById: user.id,
    },
  });
};




export const addTicketToSprintService = async ({
  sprintId,
  ticketId,
}) => {
  const sprint = await prisma.sprint.findUnique({
    where: { id: Number(sprintId) },
  });

  if (!sprint || sprint.status !== "ACTIVE") {
    throw new Error("Sprint is not active");
  }

  return prisma.ticket.update({
    where: { id: Number(ticketId) },
    data: { sprintId: sprint.id },
  });
};


export const completeSprintService = async (sprintId) => {
  const parsedId = Number(sprintId);

  return prisma.$transaction([
    prisma.sprint.update({
      where: { id: parsedId },
      data: { status: "COMPLETED" },
    }),
    prisma.ticket.updateMany({
      where: {
        sprintId: parsedId,
        status: { not: "CLOSED" },
      },
      data: { sprintId: null },
    }),
  ]);
};


export const getSprintDetailService = async (id) => {
  return prisma.sprint.findUnique({
    where: { id: Number(id) },
    include: {
      tickets: {
        orderBy: { priority: "desc" },
      },
    },
  });
};


export const listSprintsService = async () => {
  return prisma.sprint.findMany({
    orderBy: { startDate: "desc" },
  });
};



export const createSprintTicketService = async ({
  sprintId,
  data,
  user,
}) => {
  const sprint = await prisma.sprint.findUnique({
    where: { id: Number(sprintId) },
  });

   const ticketNumber = await generateTicketNumber();


  if (!sprint || sprint.status !== "ACTIVE") {
    throw new Error("Sprint is not active");
  }

  return prisma.ticket.create({
    data: {
      ...data,
      sprintId: sprint.id,
      createdById: user.id,
      ticketNumber:ticketNumber,
      status: "OPEN",
    },
  });
};

export const activateSprintService = async (sprintId) => {
  const id = Number(sprintId);

  return prisma.$transaction([
    prisma.sprint.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "COMPLETED" },
    }),
    prisma.sprint.update({
      where: { id },
      data: { status: "ACTIVE" },
    }),
  ]);
};
