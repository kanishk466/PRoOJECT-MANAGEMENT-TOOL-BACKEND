import { Router } from "express";
import { joinMeeting } from "../controllers/meet.controller.js";
import { endConsultation } from "../controllers/endConsultation.controller.js";


const router = Router();

router.post("/join", joinMeeting);

router.post("/end", endConsultation);

export default router;
