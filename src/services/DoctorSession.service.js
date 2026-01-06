import DoctorSession from "../models/DoctorSession.js";

class DoctorSessionService {

  /* -----------------------------------------
   * Check if doctor is already busy (has an active session with a different appointment)
   * ----------------------------------------- */
  async isDoctorBusy(doctorUserId, appointmentId) {
    const activeSession = await DoctorSession.findOne({ 
      doctorUserId, 
      status: "ACTIVE" 
    });

    if (activeSession && activeSession.appointmentId !== appointmentId) {
      return activeSession;
    }

    return null;
  }

  /* -----------------------------------------
   * Start a new doctor session for an appointment
   * ----------------------------------------- */
  async startSession({ doctorUserId, appointmentId }) {
    const newSession = new DoctorSession({
      doctorUserId,
      appointmentId,
      status: "ACTIVE"
    });

    return await newSession.save();
  }

  /* -----------------------------------------
   * End the doctor session for a specific appointment
   * ----------------------------------------- */
  async endSession(doctorUserId, appointmentId) {
    return DoctorSession.findOneAndUpdate(
      { doctorUserId, appointmentId, status: "ACTIVE" },
      {
        status: "ENDED",
        endedAt: new Date()
      },
      { new: true }
    );
  }

  /* -----------------------------------------
   * Calculate session duration (in minutes) since startedAt
   * ----------------------------------------- */
  calculateDurationMinutes(session) {
    if (!session?.startedAt) return 0;

    const now = new Date();
    const diffMs = now - session.startedAt;

    return Math.floor(diffMs / 60000);
  }
}

export default new DoctorSessionService();
