import asyncHandler from "express-async-handler";
import { createTicketSchema , updateStatusSchema } from "./ticket.validation.js";
import { createTicketService , assignTicketService , updateTicketStatusService , listTicketsService , getTicketDetailService } from "./ticket.service.js";

export const createTicket = asyncHandler(async (req, res) => {
  const { error, value } = createTicketSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const ticket = await createTicketService({
    ...value,
    createdBy: req.user,
  });

  res.status(201).json({
    message: "Ticket created successfully",
    ticket,
  });
});









export const assignTicket = asyncHandler(async (req, res) => {


  const ticket = await assignTicketService({
    ticketId: req.params.id,
    assignedToId: req.body.assignedToId,
    manager: req.user,
  });

  res.status(200).json({
    message: "Ticket assigned successfully",
    ticket,
  });
});








export const updateTicketStatus = asyncHandler(async (req, res) => {
  const { error, value } = updateStatusSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const ticket = await updateTicketStatusService({
    ticketId: req.params.id,
    newStatus: value.status,
    user: req.user,
  });

  res.status(200).json({
    message: "Ticket status updated successfully",
    ticket,
  });
});






export const listTickets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, priority, assignedToId } = req.query;


  console.log(req.user);
  
  const result = await listTicketsService({
    user: req.user,
    filters: { status, priority, assignedToId },
    page: Number(page),
    limit: Number(limit),
  });

  res.status(200).json(result);
});



export const getTicketDetail = asyncHandler(async (req, res) => {
  const ticket = await getTicketDetailService({
    ticketId: req.params.id,
    user: req.user,
  });

  res.status(200).json({ ticket });
});