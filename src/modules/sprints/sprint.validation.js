import Joi from "joi";

export const createSprintSchema = Joi.object({
  name: Joi.string().min(3).required(),
  goal: Joi.string().optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref("startDate")).required(),
});

export const createSprintTicketSchema = Joi.object({
  title: Joi.string().min(5).required(),
  description: Joi.string().min(10).required(),
  priority: Joi.string()
    .valid("CRITICAL", "HIGH", "MEDIUM", "LOW")
    .required(),
});

export const addTicketToSprintSchema = Joi.object({
  ticketId: Joi.number().integer().required(),
});
