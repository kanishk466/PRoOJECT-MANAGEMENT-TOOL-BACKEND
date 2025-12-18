import Joi from "joi";

export const createCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required(),
});

export const updateCommentSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required(),
});


