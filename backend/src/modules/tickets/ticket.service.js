import prisma from "../../config/prisma.js";
import { generateTicketNumber } from "./ticket.utils.js";

import { canTransition } from "./ticket.rules.js";

// export const createTicketService = async ({
//   title,
//   description,
//   priority,
//   assignedToId,
//   createdBy,
// }) => {
//   const ticketNumber = await generateTicketNumber();

//   const status = assignedToId ? "ASSIGNED" : "OPEN";

//   const ticket = await prisma.ticket.create({
//     data: {
//       ticketNumber,
//       title,
//       description,
//       priority,
//       status,
//       createdById: createdBy.id,
//       assignedToId: assignedToId || null,
//       histories: {
//         create: {
//           userId: createdBy.id,
//           action: "CREATED",
//           newValue: status,
//         },
//       },
//     },
//   });

//   return ticket;
// };









export const createTicketService = async ({
  title,
  description,
  priority,
  attachments = [],
  createdBy,
}) => {
  const ticketNumber = await generateTicketNumber();

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      title,
      description,
      priority,
      status: "OPEN",
      createdById: createdBy.id,

      attachments: {
        create: attachments.map((file) => ({
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          fileUrl: file.fileUrl,
          userId: createdBy.id,
        })),
      },

      histories: {
        create: {
          userId: createdBy.id,
          action: "CREATED",
          newValue: "OPEN",
        },
      },
    },
  });

  return ticket;
};



export const assignTicketService = async ({
  ticketId,
  assignedToId,
  manager,
}) => {
  // 1. Check ticket
   const parsedAssignedToId = Number(assignedToId);

    const parsedTicketId = Number(ticketId)
  
  const ticket = await prisma.ticket.findUnique({
    where: { id: parsedTicketId },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // 2. Check developer
  const developer = await prisma.user.findUnique({
    where: { id: parsedAssignedToId },
  });

  console.log(developer);
  
  if (!developer || developer.role !== "DEVELOPER" || !developer.isActive) {
    throw new Error("Invalid developer assignment");
  }

  // 3. Assign ticket
  const updatedTicket = await prisma.ticket.update({
    where: { id: parsedTicketId },
    data: {
      status: "ASSIGNED",
      assignedToId:parsedAssignedToId,
      histories: {
        create: {
          userId: manager.id,
          action: "ASSIGNED",
          oldValue: ticket.assignedToId
          ? ticket.assignedToId.toString()
          : "UNASSIGNED",
        newValue:assignedToId, // ✅ FIX
        },
      },
    },
  });

  return updatedTicket;
};





export const updateTicketStatusService = async ({
  ticketId,
  newStatus,
  user,
}) => {
  const parsedTicketId = Number(ticketId);
  if (isNaN(parsedTicketId)) {
    throw new Error("Invalid ticket ID");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: parsedTicketId },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Developer can only update their own tickets
  if (
    user.role === "DEVELOPER" &&
    ticket.assignedToId !== user.id
  ) {
    throw new Error("You can only update your assigned tickets");
  }

  const allowed = canTransition(user.role, ticket.status, newStatus);

  if (!allowed) {
    throw new Error(
      `Invalid status transition from ${ticket.status} to ${newStatus}`
    );
  }

  return prisma.ticket.update({
    where: { id: parsedTicketId },
    data: {
      status: newStatus,
      histories: {
        create: {
          userId: user.id,
          action: "STATUS_CHANGED",
          oldValue: ticket.status,
          newValue: newStatus,
        },
      },
    },
  });
};



export const listTicketsService = async ({
  user,
  filters,
  page = 1,
  limit = 10,
}) => {
  const skip = (page - 1) * limit;

  const where = {};

  // 🔐 Role-based visibility
  if (user.role === "DEVELOPER") {
    where.assignedToId = user.id;
  }

  // 🎯 Filters
  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.assignedToId) {
    where.assignedToId = Number(filters.assignedToId);
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    tickets,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};



export const getTicketDetailService = async ({
  ticketId,
  user,
}) => {
  const parsedTicketId = Number(ticketId);
  if (isNaN(parsedTicketId)) {
    throw new Error("Invalid ticket ID");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: parsedTicketId },
    include: {
      createdBy: {
        select: { id: true, name: true, role: true },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
      // histories: {
      //   orderBy: { createdAt: "desc" },
      //   include: {
      //     user: {
      //       select: { id: true, name: true, role: true },
      //     },
      //   },
      // },
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // 🔐 Developer access check
  if (
    user.role === "DEVELOPER" &&
    ticket.assignedToId !== user.id
  ) {
    throw new Error("You do not have access to this ticket");
  }

  return ticket;
};
