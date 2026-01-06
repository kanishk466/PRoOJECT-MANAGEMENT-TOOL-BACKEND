import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, required: true, unique: true },
    patientUserId: { type: String, required: true },
    doctorUserId: { type: String, required: true },
    clinicId: { type: String, required: true },

    //  New telemedicine fields
    meetingId: { type: String, required: false },
    meetingUrl: { type: String, required: false },
    roomName: { type: String, required: false },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    status: {
      type: String,
      enum: [
        "SCHEDULED",
        "RESCHEDULED",
        "CHECKED_IN",
        "ADMITTED",
        "IN_CONSULTATION",
        "COMPLETED",
        "CANCELLED",
        "MISSED",
        "NO_SHOW",
      ],
      default: "SCHEDULED",
    },

    // Who booked
    bookedByUserId: { type: String },
    bookedByRole: { type: String },

    // Appointment type
    appointmentByType: {
      type: String,
      enum: ["FOLLOW_UP", "CHECK_UP", "SPECIALIST", "INITIAL_CONSULTATION"],
      required: true,
    },

    version: { type: Number, default: 0 }, // used for safe state transitions
    participantsJoined: { type: [String], default: [] },
    webhookEventsProcessed: { type: [String], default: [] },

    recordingSid: { type: String },
    recordingUrl: { type: String },
    recordingStoredAt: { type: Date },

    twilioRoomStatus: { type: String },
    callEndedAt: { type: Date },
  },

  { timestamps: true }
);

export default mongoose.model("Appointment", AppointmentSchema);
