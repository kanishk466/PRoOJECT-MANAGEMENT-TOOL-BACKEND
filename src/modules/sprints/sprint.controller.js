import asyncHandler from "express-async-handler";
import {
  createSprintService,
  listSprintsService,
  getSprintDetailService,
  activateSprintService,
  completeSprintService,
  createSprintTicketService,
  addTicketToSprintService,
} from "./sprint.service.js";

import {
  createSprintSchema,
  createSprintTicketSchema,
  addTicketToSprintSchema,
} from "./sprint.validation.js";

/**
 * ✅ Create Sprint (Manager)
 */
export const createSprint = asyncHandler(async (req, res) => {
  const { error, value } = createSprintSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const sprint = await createSprintService({
    data: value,
    user: req.user,
  });

  res.status(201).json({
    message: "Sprint created successfully",
    sprint,
  });
});

/**
 * ✅ List All Sprints (All roles)
 */
export const listSprints = asyncHandler(async (req, res) => {
  const sprints = await listSprintsService();

  res.json({
    sprints,
  });
});

/**
 * ✅ Sprint Detail + Tickets (All roles)
 */
export const getSprintDetail = asyncHandler(async (req, res) => {
  const sprint = await getSprintDetailService(req.params.id);

  if (!sprint) {
    res.status(404);
    throw new Error("Sprint not found");
  }

  res.json({
    sprint,
  });
});

/**
 * ✅ Activate Sprint (Manager)
 */
export const activateSprint = asyncHandler(async (req, res) => {
  await activateSprintService(req.params.id);

  res.json({
    message: "Sprint activated successfully",
  });
});




/**
 * ✅ Complete Sprint (Manager)
 */
export const completeSprint = asyncHandler(async (req, res) => {
  await completeSprintService(req.params.id);

  res.json({
    message: "Sprint completed successfully",
  });
});

/**
 * ✅ Create Ticket Inside Sprint (Tester / Manager)
 */
export const createSprintTicket = asyncHandler(async (req, res) => {
  const { error, value } = createSprintTicketSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const ticket = await createSprintTicketService({
    sprintId: req.params.sprintId,
    data: value,
    user: req.user,
  });

  res.status(201).json({
    message: "Ticket created inside sprint",
    ticket,
  });
});

/**
 * ✅ Add Existing Ticket to Sprint (Manager)
 */
export const addTicketToSprint = asyncHandler(async (req, res) => {
  const { error, value } = addTicketToSprintSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const ticket = await addTicketToSprintService({
    sprintId: req.params.id,
    ticketId: value.ticketId,
  });

  res.json({
    message: "Ticket added to sprint",
    ticket,
  });
});
