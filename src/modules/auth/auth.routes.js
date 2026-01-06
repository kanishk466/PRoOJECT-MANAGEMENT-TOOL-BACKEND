// TODO: Implement
import express from "express";
import { login , getUsers } from "./auth.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", login);

router.get(
  "/users",
  authMiddleware,
  getUsers
);

export default router;
