
import { Router } from "express";
import {
  create, getById, update, reschedule, cancel,
    list , admitPatient , patientCheckIn
} from "../controllers/AppointmentController.js";

const router = Router();

router.post("/create", create);
router.get("/list", list);
router.get("/:appointmentId", getById);
router.put("/update/:appointmentId", update);
router.patch("/reschedule/:appointmentId", reschedule);
router.patch("/cancel/:appointmentId", cancel);
router.patch("/:id/admit",admitPatient);
router.post("/:appointmentId/check-in", patientCheckIn);

export default router;
