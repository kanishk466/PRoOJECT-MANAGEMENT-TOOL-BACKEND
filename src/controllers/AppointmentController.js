// src/controllers/AppointmentController.js
import AppointmentService from "../services/AppointmentService.js";
import { successResponse, errorResponse } from "../utils/response.js";

import { admitPatientService } from "../services/admit.service.js";

import { auditLogger } from "../utils/audit.logger.js";

import logger from "../utils/logger.js";

const service = new AppointmentService();

export const create = async (req, res) => {
  try {
    // console.log(req.body);
    
    const { result, error, code } = await service.createAppointment(req.body);

    if (error) return errorResponse(res, error, code);

     auditLogger.info({
      event: "CREATE_APPOINTMENT",
      userId: req.body?.bookedByUserId,
      role: req.body?.bookedByRole,
      appointmentId: result?.appointmentId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString()
    });

    return successResponse(res,"Appointment created", 200);
  } catch (err) {
    logger.error("create controller error: " + err.stack || err.message);
    return errorResponse(res, "Server error", 500);
  }
};

export const getById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { result, error, code } = await service.getAppointmentById(appointmentId);
    if (error) return errorResponse(res, error, code);
    console.log(result);
    
    return successResponse(res, result, "Appointment fetched", 200);
  } catch (err) {
    logger.error("getById controller error: " + err.stack || err.message);
    return errorResponse(res, "Server error", 500);
  }
};

export const update = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const updates = req.body;
    const { result, error, code } = await service.updateAppointment(appointmentId, updates);
    if (error) return errorResponse(res, error, code);
    return successResponse(res, result, "Appointment updated", 200);
  } catch (err) {
    logger.error("update controller error: " + err.stack || err.message);
    return errorResponse(res, "Server error", 500);
  }
};

export const reschedule = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const { newStartTime, newEndTime, requestedByUserId, requestedByRole, reason } = req.body;
    const { result, error, code } = await service.rescheduleAppointment(appointmentId, newStartTime, newEndTime, { userId: requestedByUserId, role: requestedByRole }, reason);
    if (error) return errorResponse(res, error, code);
    return successResponse(res, result, "Appointment rescheduled", 200);
  } catch (err) {
    logger.error("reschedule controller error: " + err.stack || err.message);
    return errorResponse(res, "Server error", 500);
  }
};

export const cancel = async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    const { cancelledByUserId, cancelledByRole, reason } = req.body;
    const { result, error, code } = await service.cancelAppointment(appointmentId, cancelledByUserId, cancelledByRole, reason);
    if (error) return errorResponse(res, error, code);
    return successResponse(res, result, "Appointment cancelled", 200);
  } catch (err) {
    logger.error("cancel controller error: " + err.stack || err.message);
    return errorResponse(res, "Server error", 500);
  }
};




export const admitPatient = async (req, res) => {
  const { id } = req.params; // appointmentId
  const {userId} = req.body;

  const { result, error, code } = await admitPatientService(id, userId);

  if (error) {
    return res.status(code).json({ success: false, message: error });
  }

   auditLogger.info({
      event: "ADMIT_PATIENT",
      userId: userId, 
      role: "DOCTOR",
      appointmentId: id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString()
    });


  return res.json({ success: true, data: result });
};










export const patientCheckIn = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { userId } = req.body; // from auth middleware

    const { result, error, code } = await service.patientCheckIn({
      appointmentId,
      patientUserId: userId
    });

    auditLogger.info({
      event: "PATIENT_CHECK_IN",
      userId: req.body?.userId, 
      role: "PATIENT",
      appointmentId: appointmentId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString()
    });


    if (error) return errorResponse(res, error, code);


    return successResponse(res, result, "Patient checked in", 200);
  } catch (err) {
    logger.error("patientCheckIn controller error: " + err.stack || err.message);
    return errorResponse(res, "Server error", 500);
  }
}









export const list = async (req, res) => {
  try {
    const filters = {
      clinicId: req.query.clinicId,
      doctorUserId: req.query.doctorUserId,
      status: req.query.status,

      day: req.query.day,
      week: req.query.week,
      month: req.query.month, 
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir
    };
    const { result, error, code } = await service.listAppointments(filters, options);
    if (error) return errorResponse(res, error, code);
    return successResponse(res, result, "Appointments listed", 200);
  } catch (err) {
    logger.error("list controller error: " + err.stack || err.message);
    return errorResponse(res, "Server error", 500);
  }
};
