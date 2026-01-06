
import Appointment from "../models/Appointment.js";

import logger from "../utils/logger.js";


import {  autoMarkMissedInList  , checkAndApplyMissedStatus} from "../utils/updateMissedStatus.js";
import { populateUsersForAppointments } from "../utils/populateUsers.js";
import { v4 as uuidv4 } from "uuid";

export default class AppointmentService {
  constructor() {}

async createAppointment(data) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {
    logger.info("Creating appointment request received");

    // -----------------------------
    // 1. Required field validation
    // -----------------------------
    const requiredFields = [
      "patientUserId",
      "doctorUserId",
      "clinicId",
      "startTime",
      "endTime",
      "appointmentByType"
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        logger.warn(`Missing required field: ${field}`);
        await session.abortTransaction();
        return { error: `${field} is required`, code: 400 };
      }
    }

    // -----------------------------
    // 2. Generate appointmentId + telemedicine IDs
    // -----------------------------
    const appointmentId = `APT-${uuidv4()}`;
    const meetingId = uuidv4().replace(/-/g, "").slice(0, 14);  // compact meetingId
    const meetingUrl = `${process.env.APP_BASE_URL}/meet/${meetingId}`;
    const roomName = `consult_${appointmentId}`;

    data.appointmentId = appointmentId;
    data.meetingId = meetingId;
    data.meetingUrl = meetingUrl;
    data.roomName = roomName;

    // -----------------------------
    // 3. Normalize dates to UTC
    // -----------------------------
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      logger.warn("Invalid date format received");
      await session.abortTransaction();
      return { error: "Invalid date format", code: 400 };
    }

    data.startTime = start;
    data.endTime = end;

    // -----------------------------
    // 4. Prevent past appointments
    // -----------------------------
    const now = new Date();
    if (start.getTime() <= now.getTime()) {
      logger.warn(`Attempt to create appointment in past: ${start.toISOString()}`);
      await session.abortTransaction();
      return { error: "Cannot create appointment in past", code: 400 };
    }

    // -----------------------------
    // 5. Validate time order
    // -----------------------------
    if (end <= start) {
      logger.warn("endTime must be greater than startTime");
      await session.abortTransaction();
      return { error: "endTime must be greater than startTime", code: 400 };
    }

    // -----------------------------
    // 6. Doctor conflict check
    // -----------------------------
    const doctorConflict = await Appointment.findOne(
      {
        doctorUserId: data.doctorUserId,
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] }
      },
      null,
      { session }
    );

    if (doctorConflict) {
      await session.abortTransaction();
      return {
        error: "Doctor already booked in this time window",
        code: 409,
      };
    }

    // -----------------------------
    // 7. Patient conflict
    // -----------------------------
    const patientConflict = await Appointment.findOne(
      {
        patientUserId: data.patientUserId,
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] }
      },
      null,
      { session }
    );

    if (patientConflict) {
      await session.abortTransaction();
      return {
        error: "Patient already has another appointment in this window",
        code: 409,
      };
    }

    // -----------------------------
    // 8. DEFAULT STATUS = SCHEDULED
    // -----------------------------
    data.status = "SCHEDULED";

    // -----------------------------
    // 9. Create Appointment
    // -----------------------------
    const created = await Appointment.create([data], { session });
    await session.commitTransaction();

    logger.info(
      `Appointment created with telemedicine room: ID=${appointmentId}, room=${roomName}`
    );

    return { result: created[0].toObject(), code: 200 };
  } catch (err) {
    await session.abortTransaction();
    logger.error("createAppointment failed: " + (err.stack || err.message));
    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }
}



  // --- get appointment by ID (REWRITTEN — PRODUCTION SAFE)
async getAppointmentById(appointmentId) {
  try {
    logger.info(`Fetch appointment by ID: ${appointmentId}`);

    if (!appointmentId) {
      return { error: "appointmentId required", code: 400 };
    }

    // Step 1: Fetch appointment
    let appt = await Appointment.findOne({ appointmentId:appointmentId }).lean();

    if (!appt) {
      logger.warn(`Appointment not found: ${appointmentId}`);
      return { error: "Appointment not found", code: 404 };
    }

    // Step 2: Check & mark MISSED if applicable
    const updated = await checkAndApplyMissedStatus(appt);

    // Step 3: Return final updated object
    return { result: updated, code: 200 };
  } catch (err) {
    logger.error(
      "getAppointmentById failed: " + (err.stack || err.message)
    );
    return { error: "Server Error", code: 500 };
  }
}


  // --- update appointment (allowed only in SCHEDULED)

// --- update appointment (REWRITTEN — production grade)
async updateAppointment(appointmentId, updates) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {
    logger.info(`Update request received for appointmentId=${appointmentId}`);

    // ---------------------------------------------------
    // 1. Fetch existing appointment
    // ---------------------------------------------------
    const existing = await Appointment.findOne(
      { appointmentId },
      null,
      { session }
    ).lean();

    if (!existing) {
      logger.warn(`Appointment not found: ${appointmentId}`);
      await session.abortTransaction();
      return { error: "Appointment not found", code: 404 };
    }

    // ---------------------------------------------------
    // 2. Only SCHEDULED can be updated
    // ---------------------------------------------------
    if (existing.status !== "ADMITTED") {
      logger.warn(
        `Attempted update on non-SCHEDULED appointment ${appointmentId} (status=${existing.status})`
      );
      await session.abortTransaction();
      return {
        error: "Only SCHEDULED appointments can be updated",
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 3. Allowed update fields
    // ---------------------------------------------------
    const allowed = [
      "startTime",
      "endTime",
      "appointmentByType",
      "doctorUserId",
    ];
    const payload = {};

    for (const k of allowed) {
      if (updates[k]) {
        if (k === "startTime" || k === "endTime") {
          const dt = new Date(updates[k]);
          if (isNaN(dt.getTime())) {
            await session.abortTransaction();
            return { error: `${k} is invalid date`, code: 400 };
          }
          payload[k] = dt;
        } else {
          payload[k] = updates[k];
        }
      }
    }

    if (Object.keys(payload).length === 0) {
      await session.abortTransaction();
      return { error: "No valid fields to update", code: 400 };
    }

    // ---------------------------------------------------
    // 4. Determine final values for conflict checking
    // ---------------------------------------------------
    const newStart = payload.startTime
      ? new Date(payload.startTime)
      : new Date(existing.startTime);

    const newEnd = payload.endTime
      ? new Date(payload.endTime)
      : new Date(existing.endTime);

    const newDoctor = payload.doctorUserId || existing.doctorUserId;
    const patientId = existing.patientUserId;

    // ---------------------------------------------------
    // 5. Validate date order & past-time
    // ---------------------------------------------------
    if (newEnd <= newStart) {
      await session.abortTransaction();
      return { error: "endTime must be greater than startTime", code: 400 };
    }

    if (newStart.getTime() <= Date.now()) {
      await session.abortTransaction();
      return { error: "Cannot update appointment to past time", code: 400 };
    }

    // ---------------------------------------------------
    // 6. Doctor availability conflict check
    // ---------------------------------------------------
    const doctorConflict = await Appointment.findOne(
      {
        appointmentId: { $ne: appointmentId },
        doctorUserId: newDoctor,
        startTime: { $lt: newEnd },
        endTime: { $gt: newStart },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] },
      },
      null,
      { session }
    );

    if (doctorConflict) {
      logger.warn(
        `Doctor conflict on update for doctor=${newDoctor}, start=${newStart}, end=${newEnd}`
      );
      await session.abortTransaction();
      return { error: "Doctor not available in this time window", code: 409 };
    }

    // ---------------------------------------------------
    // 7. Patient conflict prevention
    // ---------------------------------------------------
    const patientConflict = await Appointment.findOne(
      {
        appointmentId: { $ne: appointmentId },
        patientUserId: patientId,
        startTime: { $lt: newEnd },
        endTime: { $gt: newStart },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] },
      },
      null,
      { session }
    );

    if (patientConflict) {
      logger.warn(
        `Patient conflict on update for patient=${patientId}, start=${newStart}, end=${newEnd}`
      );
      await session.abortTransaction();
      return {
        error: "Patient already has an overlapping appointment",
        code: 409,
      };
    }

    // ---------------------------------------------------
    // 8. Apply update
    // ---------------------------------------------------
    payload.updatedAt = new Date();

    const updated = await Appointment.findOneAndUpdate(
      { appointmentId },
      { $set: payload },
      { new: true, session }
    ).lean();

    await session.commitTransaction();

    logger.info(`Appointment updated successfully: ${appointmentId}`);

    return { result: updated, code: 200 };
  } catch (err) {
    await session.abortTransaction();
    logger.error("updateAppointment failed: " + (err.stack || err.message));
    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }
}





// --- reschedule appointment (REWRITTEN)
async rescheduleAppointment(
  appointmentId,
  newStartTime,
  newEndTime,
  requestedBy = {},
  reason = null
) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {
    logger.info(`Reschedule request for appointmentId=${appointmentId}`);

    // ---------------------------------------------------
    // 1. Load existing appointment
    // ---------------------------------------------------
    const existing = await Appointment.findOne(
      { appointmentId },
      null,
      { session }
    ).lean();

    if (!existing) {
      await session.abortTransaction();
      return { error: "Appointment not found", code: 404 };
    }

    // ---------------------------------------------------
    // 2. Validate status
    // ---------------------------------------------------
    if (!["SCHEDULED", "RESCHEDULED"].includes(existing.status)) {
      logger.warn(
        `Reschedule not allowed — status=${existing.status}, appointmentId=${appointmentId}`
      );
      await session.abortTransaction();
      return {
        error: "Reschedule allowed only when SCHEDULED or RESCHEDULED",
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 3. Validate new dates
    // ---------------------------------------------------
    const start = new Date(newStartTime);
    const end = new Date(newEndTime);

    if (isNaN(start) || isNaN(end)) {
      await session.abortTransaction();
      return { error: "Invalid start/end time", code: 400 };
    }

    if (end <= start) {
      await session.abortTransaction();
      return { error: "endTime must be greater than startTime", code: 400 };
    }

    if (start.getTime() <= Date.now()) {
      await session.abortTransaction();
      return { error: "Cannot reschedule to past time", code: 400 };
    }

    const doctorId = existing.doctorUserId;
    const patientId = existing.patientUserId;

    // ---------------------------------------------------
    // 4. Doctor conflict
    // ---------------------------------------------------
    const doctorConflict = await Appointment.findOne(
      {
        appointmentId: { $ne: appointmentId },
        doctorUserId: doctorId,
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] },
      },
      null,
      { session }
    );

    if (doctorConflict) {
      logger.warn(
        `Doctor conflict (reschedule): doctor=${doctorId}, start=${start}, end=${end}`
      );
      await session.abortTransaction();
      return {
        error: "Doctor already booked in this time window",
        code: 409,
      };
    }

    // ---------------------------------------------------
    // 5. Patient conflict
    // ---------------------------------------------------
    const patientConflict = await Appointment.findOne(
      {
        appointmentId: { $ne: appointmentId },
        patientUserId: patientId,
        startTime: { $lt: end },
        endTime: { $gt: start },
        status: { $nin: ["CANCELLED", "MISSED", "COMPLETED"] },
      },
      null,
      { session }
    );

    if (patientConflict) {
      logger.warn(
        `Patient conflict (reschedule): patient=${patientId}, start=${start}, end=${end}`
      );
      await session.abortTransaction();
      return {
        error: "Patient already has another appointment in this time window",
        code: 409,
      };
    }

    // ---------------------------------------------------
    // 6. Update
    // ---------------------------------------------------
    const updated = await Appointment.findOneAndUpdate(
      { appointmentId },
      {
        $set: {
          startTime: start,
          endTime: end,
          status: "RESCHEDULED",
          updatedAt: new Date(),
          rescheduleReason: reason || null,
          rescheduledByUserId: requestedBy.userId || null,
          rescheduledByRole: requestedBy.role || null,
        },
      },
      { new: true, session }
    ).lean();

    await session.commitTransaction();

    logger.info(`Appointment rescheduled successfully: ${appointmentId}`);

    return { result: updated, code: 200 };
  } catch (err) {
    await session.abortTransaction();
    logger.error(
      "rescheduleAppointment failed: " + (err.stack || err.message)
    );
    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }
}




  // --- cancel





// --- cancel appointment (REWRITTEN — production safe)
async cancelAppointment(
  appointmentId,
  cancelledByUserId = null,
  cancelledByRole = null,
  reason = null
) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {
    logger.info(
      `Cancel request received for appointmentId=${appointmentId}, byUser=${cancelledByUserId}, role=${cancelledByRole}`
    );

    // ---------------------------------------------------
    // 1. Fetch appointment
    // ---------------------------------------------------
    const existing = await Appointment.findOne(
      { appointmentId },
      null,
      { session }
    ).lean();

    if (!existing) {
      logger.warn(`Cancel failed — Appointment not found: ${appointmentId}`);
      await session.abortTransaction();
      return { error: "Appointment not found", code: 404 };
    }

    const currentStatus = existing.status;

    // ---------------------------------------------------
    // 2. Only certain statuses allow cancellation
    // ---------------------------------------------------
    const cancellableStatuses = ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"];

    if (!cancellableStatuses.includes(currentStatus)) {
      logger.warn(
        `Cancel not allowed — status=${currentStatus}, appointmentId=${appointmentId}`
      );
      await session.abortTransaction();
      return {
        error: `Cannot cancel appointment in status ${currentStatus}`,
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 3. Block double cancellation
    // ---------------------------------------------------
    if (currentStatus === "CANCELLED") {
      logger.warn(
        `Cancel ignored — already cancelled, appointmentId=${appointmentId}`
      );
      await session.abortTransaction();
      return {
        error: "Appointment already cancelled",
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 4. Prepare update payload
    // ---------------------------------------------------
    const update = {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledByUserId: cancelledByUserId || null,
      cancelledByRole: cancelledByRole || null,
      cancelReason: reason || null,
      updatedAt: new Date(),
    };

    // ---------------------------------------------------
    // 5. Apply update atomically
    // ---------------------------------------------------
    const updated = await Appointment.findOneAndUpdate(
      { appointmentId },
      { $set: update },
      { new: true, session }
    ).lean();

    await session.commitTransaction();

    // logger.info(
    //   `Appointment cancelled successfully: ${appointmentId}, by ${cancelledByRole} (${cancelledByUserId})`
    // );

  logger.info("Appointment cancelled successfully");


    return { result: updated, code: 200 };
  } catch (err) {
    await session.abortTransaction();
    logger.error(
      "cancelAppointment failed: " + (err.stack || err.message)
    );
    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }
}





// --- list appointments (with calendar/day/week/month filters)
async listAppointments(filters = {}, options = {}) {
  try {
    // logger.info("Listing appointments with filters: " + JSON.stringify(filters));

    const query = {};

    // console.log(filters);
    

    // --------------------------------------
    // 1. Basic Filters
    // --------------------------------------
    if (filters.clinicId) query.clinicId = filters.clinicId;
    if (filters.doctorUserId) query.doctorUserId = filters.doctorUserId;
    if (filters.status) query.status = filters.status;

    // --------------------------------------
    // 2. Calendar Filters (day, week, month)
    //    PRIORITY:
    //    calendar > week > month > startDate range
    // --------------------------------------

    const dateFilter = {};

    // ---- A. DAY FILTER (Specific date)
    if (filters.day) {
      const d = new Date(filters.day);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));

      dateFilter.$gte = start;
      dateFilter.$lte = end;
    }

    // ---- B. WEEK FILTER (ISO week: Monday–Sunday)

        else if (filters.week) {
          const base = new Date(filters.week);

          let day = base.getDay();
          if (day === 0) day = 7; // ISO: Sunday=7

          const start = new Date(base);
          start.setDate(base.getDate() - (day - 1));
          start.setHours(0, 0, 0, 0);

          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);

          dateFilter.$gte = start;
          dateFilter.$lte = end;
        }


    // ---- C. MONTH FILTER (YYYY-MM)
    else if (filters.month) {
      const [year, month] = filters.month.split("-").map(Number);

      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

      dateFilter.$gte = start;
      dateFilter.$lte = end;
    }

    // ---- D. START - END RANGE FILTER
    else if (filters.startDate || filters.endDate) {
      if (filters.startDate)
        dateFilter.$gte = new Date(filters.startDate);
      if (filters.endDate)
        dateFilter.$lte = new Date(filters.endDate);
    }

    // Attach date filter
    if (Object.keys(dateFilter).length > 0) {
      query.startTime = dateFilter;
    }

    // --------------------------------------
    // 3. Pagination + Sorting
    // --------------------------------------
    const page = Math.max(Number(options.page) || 1, 1);
    const limit = Math.min(Number(options.limit) || 25, 100);
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "startTime";
    const sortDir = options.sortDir === "desc" ? -1 : 1;

    // --------------------------------------
    // 4. Fetch data
    // --------------------------------------
    let [items, total] = await Promise.all([
      Appointment.find(query)
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean()
        .select('appointmentId startTime endTime status patientUserId doctorUserId  meetingId '),

      Appointment.countDocuments(query),
    ]);

    logger.info(`Fetched ${items.length} appointments`);

    // --------------------------------------
    // 5. Apply MISSED status auto-check
    // --------------------------------------
    const checks = items.map((appt) =>
      checkAndApplyMissedStatus(appt)
    );

    items = await Promise.all(checks);

    items = await populateUsersForAppointments(items) 
    // --------------------------------------
    // 6. Return Response
    // --------------------------------------
    return {
      result: {
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        items,
      },
      code: 200,
    };
  } catch (err) {
    logger.error(
      "listAppointments failed: " + (err.stack || err.message)
    );
    return { error: "Server Error", code: 500 };
  }
}



async patientCheckIn({ appointmentId, patientUserId }) {
  const session = await Appointment.startSession();
  session.startTransaction();

  try {
    logger.info(
      `Patient check-in request: appointmentId=${appointmentId}, patientUserId=${patientUserId}`
    );

    // ---------------------------------------------------
    // 1. Fetch appointment
    // ---------------------------------------------------
    const existing = await Appointment.findOne(
      { appointmentId },
      null,
      { session }
    ).lean();

    if (!existing) {
      logger.warn(`Check-in failed — Appointment not found: ${appointmentId}`);
      await session.abortTransaction();
      return { error: "Appointment not found", code: 404 };
    }

    // ---------------------------------------------------
    // 2. Validate patientUserId matches
    // ---------------------------------------------------
    if (existing.patientUserId !== patientUserId) {
      logger.warn(
        `Check-in failed — patientUserId mismatch for appointmentId=${appointmentId}`
      );
      await session.abortTransaction();
      return { error: "Unauthorized check-in attempt", code: 403 };
    }

    // ---------------------------------------------------
    // 3. Validate status
    // ---------------------------------------------------
    if (existing.status !== "SCHEDULED" && existing.status !== "RESCHEDULED") {
      logger.warn(
        `Check-in not allowed — status=${existing.status}, appointmentId=${appointmentId}`
      );
      await session.abortTransaction();
      return {
        error: `Cannot check-in appointment in status ${existing.status}`,
        code: 400,
      };
    }

    // ---------------------------------------------------
    // 3.5. Time-based validations
    // ---------------------------------------------------
    const now = new Date();
    const fiveMinutesBefore = new Date(existing.startTime.getTime() - 5 * 60 * 1000);

    if (now < fiveMinutesBefore) {
      logger.warn(`Check-in too early for appointmentId=${appointmentId}`);
      await session.abortTransaction();
      return { error: "Check-in not allowed yet. Please check in 5 minutes before your appointment.", code: 400 };
    }

    if (now >= existing.endTime) {
      logger.warn(`Check-in after end time for appointmentId=${appointmentId}`);
      await session.abortTransaction();
      return { error: "Appointment has already ended. Cannot check in.", code: 400 };
    }

    // ---------------------------------------------------
    // 4. Update status to CHECKED_IN
    // ---------------------------------------------------
    const updated = await Appointment.findOneAndUpdate(
      { appointmentId },
      {
        $set: {
          status: "CHECKED_IN",
          checkInAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true, session }
    ).lean();

    await session.commitTransaction();

    logger.info(`Patient checked in successfully: ${appointmentId}`);

    return { result: updated.status, code: 200 };
  } catch (err) {
    await session.abortTransaction();
    logger.error(
      "patientCheckIn failed: " + (err.stack || err.message)
    );
    return { error: "Server Error", code: 500 };
  } finally {
    session.endSession();
  }  }                                     

}
