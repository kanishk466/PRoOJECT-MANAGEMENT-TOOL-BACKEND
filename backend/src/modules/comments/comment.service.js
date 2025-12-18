import prisma from "../../config/prisma.js";





export const createCommentService = async ({
  ticketId,
  content,
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

  // Developer can comment only on assigned ticket
  if (
    user.role === "DEVELOPER" &&
    ticket.assignedToId !== user.id
  ) {
    throw new Error("You can only comment on your assigned tickets");
  }

  // 1️⃣ Create comment
  const comment = await prisma.comment.create({
    data: {
      content,
      ticketId: parsedTicketId,
      userId: user.id,
    },
  });

  // 2️⃣ Create audit history (SEPARATE QUERY)
  await prisma.ticketHistory.create({
    data: {
      ticketId: parsedTicketId,
      userId: user.id,
      action: "COMMENT_ADDED",
      newValue: content.slice(0, 100),
    },
  });

  return comment;
};




export const listCommentsService = async (ticketId) => {
  const parsedTicketId = Number(ticketId);
  if (isNaN(parsedTicketId)) throw new Error("Invalid ticket ID");

  return prisma.comment.findMany({
    where: { ticketId: parsedTicketId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { id: true, name: true, role: true },
      },
    },
  });
};


export const updateCommentService = async ({
  commentId,
  content,
  user,
}) => {
  const parsedCommentId = Number(commentId);
  if (isNaN(parsedCommentId)) {
    throw new Error("Invalid comment ID");
  }

  const comment = await prisma.comment.findUnique({
    where: { id: parsedCommentId },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Ownership check
  if (comment.userId !== user.id) {
    throw new Error("You can only edit your own comments");
  }

  // ⏱️ 5-minute rule
  const now = new Date();
  const createdAt = new Date(comment.createdAt);
  const diffInMinutes = (now - createdAt) / (1000 * 60);

  if (diffInMinutes > 5) {
    throw new Error("You can only edit comments within 5 minutes");
  }

  // Update comment
  const updatedComment = await prisma.comment.update({
    where: { id: parsedCommentId },
    data: { content },
  });

  // Audit
  await prisma.ticketHistory.create({
    data: {
      ticketId: comment.ticketId,
      userId: user.id,
      action: "COMMENT_EDITED",
      newValue: content.slice(0, 100),
    },
  });

  return updatedComment;
};



export const deleteCommentService = async ({
  commentId,
  user,
}) => {
  const parsedCommentId = Number(commentId);
  if (isNaN(parsedCommentId)) {
    throw new Error("Invalid comment ID");
  }

  const comment = await prisma.comment.findUnique({
    where: { id: parsedCommentId },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  const isOwner = comment.userId === user.id;
  const isManager = user.role === "MANAGER";

  if (!isOwner && !isManager) {
    throw new Error("You do not have permission to delete this comment");
  }

  await prisma.comment.delete({
    where: { id: parsedCommentId },
  });

  // Audit
  await prisma.ticketHistory.create({
    data: {
      ticketId: comment.ticketId,
      userId: user.id,
      action: "COMMENT_DELETED",
      oldValue: comment.content.slice(0, 100),
    },
  });

  return true;
};
