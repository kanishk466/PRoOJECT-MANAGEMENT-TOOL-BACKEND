import { Router } from "express";
import { getDoctorsByClinic } from "../controllers/UserController.js";

const router = Router();

// router.get("/doctors/:clinicId/:searchQuery", getDoctorsByClinic);

router.get("/clinics/:clinicId/:role", getDoctorsByClinic);

export default router;
