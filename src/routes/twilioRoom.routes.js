import { Router } from "express";
import twilioRoomController from "../controllers/twilioRoom.controller.js";


const router = Router();

// Room Details
router.get("/rooms/:sid",  twilioRoomController.getRoomDetails);

// Participants
router.get("/rooms/:sid/participants",  twilioRoomController.getRoomParticipants);

// Recordings List
router.get("/rooms/:sid/recordings",  twilioRoomController.getRoomRecordings);

// Download Recording
router.get("/recordings/:sid/download",  twilioRoomController.downloadRecording);

// Transcriptions
router.get("/rooms/:sid/transcriptions",  twilioRoomController.getRoomTranscriptions);

// Update Recording Rules
router.patch("/rooms/:sid/recording-rules",  twilioRoomController.updateRecordingRules);

export default router;
