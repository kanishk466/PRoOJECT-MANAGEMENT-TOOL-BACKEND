// TODO: Implement
import asyncHandler from "express-async-handler";
import { loginSchema } from "./auth.validation.js";
import { loginUser , getUsersService } from "./auth.service.js";

export const login = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const result = await loginUser(value);

  res.status(200).json(result);
});


export const getUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;

  const users = await getUsersService({
    role,
    requester: req.user,
  });

  res.json({
    users,
  });
});