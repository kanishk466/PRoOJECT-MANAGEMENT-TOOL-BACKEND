import Appointment from "../models/Appointment.js";
import { meetingService } from "../services/meeting.service.js";
import DoctorSessionService from "../services/DoctorSession.service.js";
import logger from "../utils/logger.js";

export const endConsultation = async (req, res) => {
  try {
    const { appointmentId , doctorUserId } = req.body;
    // const doctorUserId = req.body;

    logger.info("End consultation request", {
      appointmentId,
      doctorUserId
    });

    /* ---------------------------------------
     * Fetch appointment
     * --------------------------------------- */
    const appt = await Appointment.findOne({ appointmentId });

    if (!appt) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    /* ---------------------------------------
     * Ownership check
     * --------------------------------------- */
    if (appt.doctorUserId !== doctorUserId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized doctor"
      });
    }

    /* ---------------------------------------
     * Only active consultations can end
     * --------------------------------------- */
    if (appt.status !== "IN_CONSULTATION") {
      return res.status(400).json({
        success: false,
        message: `Cannot end consultation in status ${appt.status}`
      });
    }

    /* ---------------------------------------
     * 1️⃣ End Twilio room (best effort)
     * --------------------------------------- */
    if (appt.roomName) {
      try {
        await meetingService.endRoom(appt.roomName);
      } catch (err) {
        // Do NOT fail API
        logger.warn("Failed to end Twilio room", {
          roomName: appt.roomName,
          error: err.message
        });
      }
    }

    /* ---------------------------------------
     * 2️⃣ Update appointment
     * --------------------------------------- */
    appt.status = "COMPLETED";
    appt.callEndedAt = new Date();
    appt.twilioRoomStatus = "COMPLETED";
    appt.version += 1;
    await appt.save();

    /* ---------------------------------------
     * 3️⃣ End doctor session (CRITICAL)
     * --------------------------------------- */
    await DoctorSessionService.endSession(
      doctorUserId,
      appt.appointmentId
    );

    logger.info("Consultation ended by doctor", {
      appointmentId: appt.appointmentId
    });

    return res.json({
      success: true,
      message: "Consultation ended successfully",
      appointmentId: appt.appointmentId,
      status: appt.status
    });

  } catch (err) {
    logger.error("endConsultation failed", {
      error: err.message,
      stack: err.stack
    });

    return res.status(500).json({
      success: false,
      message: "Failed to end consultation"
    });
  }
};
