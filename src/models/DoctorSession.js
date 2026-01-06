// import mongoose from "mongoose";

// const DoctorSessionSchema = new mongoose.Schema(
//   {
//     doctorUserId: {
//       type: String,
//       required: true,
//       unique: true,
//       index: true
//     },

//     activeAppointmentId: {
//       type: String,
//       default: null
//     },

//     activeRoomName: {
//       type: String,
//       default: null
//     },

//     activeSince: {
//       type: Date,
//       default: null
//     },

//     expectedEndTime: {
//       type: Date,
//       default: null
//     },

//     lastUpdatedAt: {
//       type: Date,
//       default: Date.now
//     }
//   },
//   { timestamps: true }
// );

// export default mongoose.model("DoctorSession", DoctorSessionSchema);



import mongoose from "mongoose";

const DoctorSessionSchema = new mongoose.Schema(
  {
    doctorUserId: {
      type: String,
      required: true,
      index: true
    },

    appointmentId: {
      type: String,
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ENDED"],
      default: "ACTIVE",
      index: true
    },

    startedAt: {
      type: Date,
      default: Date.now
    },

    endedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// 🔒 Hard rule: only ONE active session per doctor
DoctorSessionSchema.index(
  { doctorUserId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);

export default mongoose.model("DoctorSession", DoctorSessionSchema);

