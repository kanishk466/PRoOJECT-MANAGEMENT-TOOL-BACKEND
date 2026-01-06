import Appointment from "../models/Appointment.js";
import { meetingService } from "../services/meeting.service.js";
import DoctorSessionService from "../services/DoctorSession.service.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/response.js";

/* =====================================================
 * JOIN MEETING
 * ===================================================== */
/**
 * Handles joining a meeting for patients and doctors.
 * Patients can join only after doctor starts consultation.
 * Doctors start the consultation and create the room.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const joinMeeting = async (req, res) => {
  try {
    const { meetingId, role, userId } = req.body;

    // Input validation
    if (!meetingId || !role || !userId) {
      return errorResponse(
        res,
        "Missing required fields: meetingId, role, userId",
        400
      );
    }

    if (!["PATIENT", "DOCTOR"].includes(role)) {
      return errorResponse(res, "Invalid role. Must be PATIENT or DOCTOR", 400);
    }

    logger.info("Join meeting request", {
      meetingId,
      role,
      userId,
    });

    /* ---------------------------------------
     * 1. Fetch appointment by meetingId
     * --------------------------------------- */
    const appointment = await Appointment.findOne({ meetingId });

    if (!appointment) {
      return errorResponse(res, "Appointment not found", 404);
    }

    const identity = `${role.toLowerCase()}-${userId}`;

    /* =====================================================
     * PATIENT FLOW
     * ===================================================== */
    if (role === "PATIENT") {
      // Ownership check
      if (appointment.patientUserId !== userId) {
        return errorResponse(res, "Unauthorized patient", 403);
      }

      // Doctor has not started consultation
      // if (appointment.status !== "IN_CONSULTATION") {
      //   return errorResponse(res, "Waiting for doctor to start consultation", 403);
      // }

      if (!["ADMITTED", "IN_CONSULTATION"].includes(appointment.status)) {
        return errorResponse(
          res,
          "Waiting for doctor to admit/start consultation",
          403
        );
      }

      // Token generation (room already exists)
      const token = meetingService.generateToken(
        identity,
        appointment.roomName
      );

      return successResponse(
        res,
        {
          role,
          token,
          roomName: appointment.roomName,
          appointmentId: appointment.appointmentId,
          meetingId: appointment.meetingId,
          status: appointment.status,
        },
        "Patient joined meeting successfully"
      );
    }

    /* =====================================================
     * DOCTOR FLOW
     * ===================================================== */
    if (role === "DOCTOR") {
      // Ownership check
      if (appointment.doctorUserId !== userId) {
        return errorResponse(res, "Unauthorized doctor", 403);
      }

      // Doctor busy check (hard rule)
      const busySession = await DoctorSessionService.isDoctorBusy(
        userId,
        appointment.appointmentId
      );

      if (busySession) {
        return errorResponse(
          res,
          "Doctor already in another consultation",
          409
        );
      }

      // Must be admitted first
      if (appointment.status !== "ADMITTED") {
        return errorResponse(
          res,
          `Cannot start consultation in status ${appointment.status}`,
          400
        );
      }

      // Safety: roomName must exist
      if (!appointment.roomName) {
        logger.error("Room name not initialized", {
          appointmentId: appointment.appointmentId,
        });
        return errorResponse(
          res,
          "Room name not initialized for appointment",
          500
        );
      }

      /* ---------------------------------------
       * 2. Create / ensure room (doctor only)
       * --------------------------------------- */
      await meetingService.ensureRoom(appointment.roomName);

      /* ---------------------------------------
       * 3. Start doctor session
       * --------------------------------------- */
      await DoctorSessionService.startSession({
        doctorUserId: userId,
        appointmentId: appointment.appointmentId,
        roomName: appointment.roomName,
        expectedEndTime: appointment.endTime,
      });

      /* ---------------------------------------
       * 4. Move appointment to IN_CONSULTATION
       * --------------------------------------- */
      // appointment.status = "IN_CONSULTATION";
      appointment.version += 1;
      // appointment.participantsJoined = appointment.participantsJoined || [];
      // appointment.participantsJoined.push(userId);
      await appointment.save();

      /* ---------------------------------------
       * 5. Generate token
       * --------------------------------------- */
      const token = meetingService.generateToken(
        identity,
        appointment.roomName
      );

      return successResponse(
        res,
        {
          role,
          token,
          roomName: appointment.roomName,
          appointmentId: appointment.appointmentId,
          meetingId: appointment.meetingId,
          status: appointment.status,
        },
        "Doctor started consultation successfully"
      );
    }

    /* ---------------------------------------
     * Invalid role (should not reach here due to validation)
     * --------------------------------------- */
    return errorResponse(res, "Invalid role", 400);
  } catch (err) {
    logger.error("joinMeeting failed", {
      error: err.message,
      stack: err.stack,
      meetingId: req.body?.meetingId,
      role: req.body?.role,
      userId: req.body?.userId,
    });

    return errorResponse(res, "Failed to join meeting", 500);
  }
};
