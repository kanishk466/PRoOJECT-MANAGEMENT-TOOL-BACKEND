import Joi from "joi";

export const createTicketSchema = Joi.object({
  title: Joi.string().min(5).max(255).required(),
  description: Joi.string().min(10).required(),
  priority: Joi.string()
    .valid("CRITICAL", "HIGH", "MEDIUM", "LOW")
    .required(),
  assignedToId: Joi.string().uuid().optional(),
  
  attachments: Joi.array()
    .items(
      Joi.object({
        fileName: Joi.string().required(),
        fileType: Joi.string().required(),
        fileSize: Joi.number().required(),
        fileUrl: Joi.string().uri().required(),
      })
    )
    .optional(),
});








export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "OPEN",
      "ASSIGNED",
      "IN_PROGRESS",
      "BLOCKED",
      "RESOLVED",
      "CLOSED",
      "REOPENED"
    )
    .required(),
});




