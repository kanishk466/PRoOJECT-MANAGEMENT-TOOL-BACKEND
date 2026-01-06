import DoctorSession from "../models/DoctorSession.js";
import DoctorSessionService from "../services/DoctorSession.service.js";

export const getDoctorSession = async (req, res) => {
  try {
    const { doctorUserId } = req.params;

    const session = await DoctorSession.findOne({ doctorUserId });

    if (!session || !session.activeAppointmentId) {
      return res.json({
        success: true,
        doctorBusy: false
      });
    }

    const delayMinutes =
      DoctorSessionService.calculateDelayMinutes(session);

    res.json({
      success: true,
      doctorBusy: true,
      activeAppointmentId: session.activeAppointmentId,
      delayMinutes
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
