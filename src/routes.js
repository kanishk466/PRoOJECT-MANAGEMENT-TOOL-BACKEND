import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import ticketRoutes from "./modules/tickets/ticket.routes.js";
import commentRoutes from "./modules/comments/comment.routes.js";

import spintsRoutes from "./modules/sprints/sprints.route.js"


const router = express.Router();

router.use("/auth", authRoutes);

router.use("/tickets", ticketRoutes);

router.use("/", commentRoutes);

router.use("/" , spintsRoutes)



export default router;
