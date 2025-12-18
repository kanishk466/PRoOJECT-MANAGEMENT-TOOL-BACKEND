import express from "express";
import { createTicket , assignTicket , updateTicketStatus  , listTickets , getTicketDetail} from "./ticket.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js";
import { ROLES } from "../../config/constants.js";

const router = express.Router();

// Create ticket → Manager & Tester only
router.post(
  "/",
  authMiddleware,
  roleMiddleware(ROLES.MANAGER, ROLES.TESTER),
  createTicket
);


router.patch(
  "/:id/assign",
  authMiddleware,
  roleMiddleware(ROLES.MANAGER , ROLES.TESTER),
  assignTicket
);



router.patch(
  "/:id/status",
  authMiddleware,
  updateTicketStatus
);

router.get(
  "/",
  authMiddleware,
  listTickets
);


router.get(
  "/:id",
  authMiddleware,
  getTicketDetail
);
export default router;
