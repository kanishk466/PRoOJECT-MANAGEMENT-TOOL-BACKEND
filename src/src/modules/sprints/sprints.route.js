import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import roleMiddleware from "../../middlewares/role.middleware.js"
import {ROLES} from "../../config/constants.js"
import {createSprint , listSprints , getSprintDetail , activateSprint , completeSprint,createSprintTicket , addTicketToSprint} from "../sprints/sprint.controller.js"

const router = express.Router();


router.post("/sprints", authMiddleware, roleMiddleware(ROLES.MANAGER), createSprint);
router.get("/sprints", authMiddleware, listSprints);
router.get("/sprints/:id", authMiddleware, getSprintDetail);

router.post("/sprints/:id/activate", authMiddleware, roleMiddleware(ROLES.MANAGER), activateSprint);
router.post("/sprints/:id/complete", authMiddleware, roleMiddleware(ROLES.MANAGER), completeSprint);

router.post(
  "/sprints/:sprintId/tickets",
  authMiddleware,
  roleMiddleware(ROLES.MANAGER, ROLES.TESTER),
  createSprintTicket
);

router.post(
  "/sprints/:id/add-ticket",
  authMiddleware,
  roleMiddleware(ROLES.MANAGER),
  addTicketToSprint
);


export default router;
