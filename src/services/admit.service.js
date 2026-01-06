import Appointment from "../models/Appointment.js";
import logger from "../utils/logger.js";

/**
 * Admits a patient for an appointment, changing status from CHECKED_IN to ADMITTED.
 * Only frontoffice users should call this service.
 * @param {string} appointmentId - The appointment ID
 * @param {string} userId - The user ID of the frontoffice user performing the action
 * @returns {Object} - { result: appointment, code: 200 } on success, or { error: message, code: statusCode } on failure
 */
export const admitPatientService = async (appointmentId, userId) => {
  try {
    // Input validation
    if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.trim() === '') {
      return { error: "Invalid or missing appointmentId", code: 400 };
    }

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return { error: "Invalid or missing userId", code: 400 };
    }

    logger.info("Admit patient request", {
      appointmentId,
      userId
    });


    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
      return { error: "Appointment not found", code: 404 };
    }

    if (appointment.status !== "CHECKED_IN") {
      return {
        error: `Cannot admit patient when appointment is ${appointment.status}`,
        code: 400
      };
    }

    // --------------------------
// Check if appointment has required fields
// --------------------------
    if (!appointment.doctorUserId || !appointment.patientUserId) {
      logger.error("Appointment missing required user IDs", { appointmentId });
      return { error: "Appointment data incomplete", code: 500 };
    }

    // --------------------------
// Update Status → ADMITTED
// --------------------------
    appointment.status = "ADMITTED";
    appointment.version = (appointment.version || 0) + 1;
    appointment.admittedBy = userId; // Optional: track who admitted
    appointment.admittedAt = new Date(); // Optional: timestamp

    await appointment.save();

    logger.info("Patient admitted successfully", {
      appointmentId,
      newStatus: "ADMITTED",
      admittedBy: userId
    });

    return { result: appointment.status, code: 200 };

  } catch (err) {
    logger.error("Admit patient failed", {
      error: err.message,
      stack: err.stack,
      appointmentId,
      userId
    });
    return { error: "Server error", code: 500 };
  }
};
