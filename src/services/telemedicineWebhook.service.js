// import Appointment from "../models/Appointment.js";
// import logger from "../utils/logger.js";

// class TwilioWebhookService {
//   async handle(payload) {
//     try {
//       logger.info("Twilio Webhook Received", payload);

//       const event =
//         payload.StatusCallbackEvent ||
//         payload.EventType ||
//         payload.Event ||
//         "";

//       const roomName = payload.RoomName || payload.UniqueName;
//       const eventId = payload.EventSid || payload.Sid || payload.SequenceNumber;

//       if (!roomName) {
//         logger.warn("Webhook missing room name");
//         return;
//       }

//       // ------------------------------------------------------
//       // Extract appointmentId from roomName = "consult_<ID>"
//       // ------------------------------------------------------
//       let appointmentId = null;

//       if (roomName.startsWith("consult_")) {
//         appointmentId = roomName.replace("consult_", "");
//       }

//       if (!appointmentId) {
//         logger.warn("Could not extract appointmentId from roomName", roomName);
//         return;
//       }

//       // ------------------------------------------------------
//       // idempotency — ignore duplicate events
//       // ------------------------------------------------------
//       if (eventId) {
//         const exists = await Appointment.findOne({
//           appointmentId,
//           webhookEventsProcessed: eventId
//         }).lean();

//         if (exists) {
//           logger.info("Duplicate webhook ignored: " + eventId);
//           return;
//         }
//       }

//       // ------------------------------------------------------
//       // Dispatch to event handlers
//       // ------------------------------------------------------
//       switch (event.toLowerCase()) {

//         case "participant-connected":
//         case "participant.connected":
//           await this.participantConnected(appointmentId, payload, eventId);
//           break;

//         case "room-ended":
//         case "room.completed":
//           await this.roomEnded(appointmentId, eventId);
//           break;

//         case "recording-completed":
//         case "recording.completed":
//           await this.recordingCompleted(appointmentId, payload, eventId);
//           break;

//         default:
//           logger.info("Unhandled Twilio Event", event);
//       }

//     } catch (err) {
//       logger.error("Webhook Handler Error", { error: err.message, stack: err.stack });
//     }
//   }

//   /* ===========================================================
//    * PARTICIPANT CONNECTED
//    * =========================================================== */
//   async participantConnected(appointmentId, payload, eventId) {
//     try {
//       const identity = payload.ParticipantIdentity;

//       if (!identity) {
//         logger.warn("participantConnected: missing identity", payload);
//         return;
//       }

//       await Appointment.updateOne(
//         { appointmentId },
//         {
//           $addToSet: {
//             participantsJoined: identity,
//             webhookEventsProcessed: eventId
//           },
//           $set: { updatedAt: new Date() }
//         }
//       );

//       logger.info("Participant joined room", { appointmentId, identity });

//     } catch (err) {
//       logger.error("participantConnected Error", err);
//     }
//   }

//   /* ===========================================================
//    * ROOM ENDED — decide COMPLETED / MISSED / NO_SHOW
//    * =========================================================== */
//   async roomEnded(appointmentId, eventId) {
//     try {
//       const appt = await Appointment.findOne({ appointmentId });

//       if (!appt) return;

//       const joined = appt.participantsJoined || [];

//       const patientJoined = joined.some(id => id.startsWith("patient-"));
//       const doctorJoined = joined.some(id => id.startsWith("doctor-"));

//       let newStatus = "COMPLETED";

//       if (!patientJoined && !doctorJoined) {
//         newStatus = "MISSED";
//       } else if (patientJoined && !doctorJoined) {
//         newStatus = "NO_SHOW";
//       } else if (doctorJoined) {
//         newStatus = "COMPLETED";
//       }

//       await Appointment.updateOne(
//         { appointmentId },
//         {
//           $set: {
//             status: newStatus,
//             twilioRoomStatus: "COMPLETED",
//             callEndedAt: new Date(),
//             updatedAt: new Date()
//           },
//           $addToSet: { webhookEventsProcessed: eventId }
//         }
//       );

//       logger.info("Room Ended Status Update", {
//         appointmentId,
//         newStatus,
//         participants: joined
//       });

//     } catch (err) {
//       logger.error("roomEnded Error", err);
//     }
//   }

//   /* ===========================================================
//    * RECORDING COMPLETED
//    * =========================================================== */
//   async recordingCompleted(appointmentId, payload, eventId) {
//     try {
//       await Appointment.updateOne(
//         { appointmentId },
//         {
//           $set: {
//             recordingSid: payload.RecordingSid,
//             recordingUrl: payload.RecordingUrl,
//             recordingStoredAt: new Date(),
//             updatedAt: new Date()
//           },
//           $addToSet: { webhookEventsProcessed: eventId }
//         }
//       );

//       logger.info("Recording stored", { appointmentId });

//     } catch (err) {
//       logger.error("recordingCompleted Error", err);
//     }
//   }
// }

// export default new TwilioWebhookService();



/* =====================================================
 *  MEETING  webhook handler version 2
 * ===================================================== */


// import Appointment from "../models/Appointment.js";
// import DoctorSessionService from "../services/DoctorSession.service.js";
// import logger from "../utils/logger.js";

// class TwilioWebhookService {
//   /* ==========================================================
//    * ENTRY POINT
//    * ========================================================== */
//   async handle(payload) {
//     try {
//       logger.info("Twilio Webhook Received", payload);

//       const event =
//         payload.StatusCallbackEvent ||
//         payload.EventType ||
//         payload.Event ||
//         "";

//       const roomName = payload.RoomName || payload.UniqueName;
//       if (!roomName) {
//         logger.warn("Webhook ignored — missing roomName");
//         return;
//       }

//       const eventId = this._generateEventId(payload, event, roomName);

//       // ------------------------------------------------------
//       // Extract appointmentId from roomName = consult_<ID>
//       // ------------------------------------------------------
//       if (!roomName.startsWith("consult_")) {
//         logger.warn("Unknown roomName format", roomName);
//         return;
//       }

//       const appointmentId = roomName.replace("consult_", "");

//       // ------------------------------------------------------
//       // Idempotency check
//       // ------------------------------------------------------
//       if (eventId) {
//         const exists = await Appointment.findOne({
//           appointmentId,
//           webhookEventsProcessed: eventId
//         }).lean();

//         if (exists) {
//           logger.info("Duplicate webhook ignored", { eventId });
//           return;
//         }
//       }

//       // ------------------------------------------------------
//       // Dispatch
//       // ------------------------------------------------------
//       switch (event.toLowerCase()) {
//         case "room-created":
//         case "room.in-progress":
//           logger.info("Room created / in-progress", {
//             appointmentId,
//             roomName,
//             roomStatus: payload.RoomStatus
//           });
//           break;


//         case "participant-connected":
//         case "participant.connected":
//           await this.participantConnected(appointmentId, payload, eventId);
//           break;

//         case "room-ended":
//         case "room.completed":
//           await this.roomEnded(appointmentId, eventId);
//           break;

//         case "recording-completed":
//         case "recording.completed":
//           await this.recordingCompleted(appointmentId, payload, eventId);
//           break;

//         default:
//           logger.info("Unhandled Twilio event", event);
//       }

//     } catch (err) {
//       logger.error("Webhook Handler Error", {
//         error: err.message,
//         stack: err.stack
//       });
//     }
//   }

//   /* ==========================================================
//    * PARTICIPANT CONNECTED
//    * ========================================================== */
//   // async participantConnected(appointmentId, payload, eventId) {
//   //   try {
//   //     const identity = payload.ParticipantIdentity;
//   //     if (!identity) return;

//   //     const update = {
//   //       $addToSet: {
//   //         participantsJoined: identity,
//   //         webhookEventsProcessed: eventId
//   //       },
//   //       $set: {
//   //         updatedAt: new Date(),
//   //         twilioRoomStatus: "IN_PROGRESS"
//   //       }
//   //     };

//   //     // Track first join timestamps (race-safe)
//   //     if (identity.startsWith("doctor-")) {
//   //       update.$set.doctorJoinedAt = new Date();
//   //     }
//   //     if (identity.startsWith("patient-")) {
//   //       update.$set.patientJoinedAt = new Date();
//   //     }

//   //     await Appointment.updateOne({ appointmentId }, update);

//   //     logger.info("Participant connected", { appointmentId, identity });

//   //   } catch (err) {
//   //     logger.error("participantConnected error", err);
//   //   }
//   // }




//   async participantConnected(appointmentId, payload, eventId) {
//   try {
//     const identity = payload.ParticipantIdentity;
//     if (!identity) return;

//     const appt = await Appointment.findOne({ appointmentId });
//     if (!appt) return;

//     const joinedSet = new Set(appt.participantsJoined || []);
//     joinedSet.add(identity);

//     const doctorJoined = [...joinedSet].some(p =>
//       p.startsWith("doctor-")
//     );
//     const patientJoined = [...joinedSet].some(p =>
//       p.startsWith("patient-")
//     );

//     const update = {
//       participantsJoined: [...joinedSet],
//       twilioRoomStatus: "IN_PROGRESS",
//       updatedAt: new Date()
//     };

//     // track first join times (idempotent-safe)
//     if (identity.startsWith("doctor-") && !appt.doctorJoinedAt) {
//       update.doctorJoinedAt = new Date();
//     }
//     if (identity.startsWith("patient-") && !appt.patientJoinedAt) {
//       update.patientJoinedAt = new Date();
//     }

//     /* 🔥 MAIN LOGIC */
//     if (
//       appt.status === "ADMITTED" &&
//       doctorJoined &&
//       patientJoined
//     ) {
//       update.status = "IN_CONSULTATION";
//       update.consultationStartedAt = new Date();
//       update.version = (appt.version || 0) + 1;
//     }

//     await Appointment.updateOne(
//       { appointmentId },
//       {
//         $set: update,
//         $addToSet: { webhookEventsProcessed: eventId }
//       }
//     );

//     logger.info("Participant connected processed", {
//       appointmentId,
//       doctorJoined,
//       patientJoined,
//       newStatus: update.status || appt.status
//     });

//   } catch (err) {
//     logger.error("participantConnected error", err);
//   }
// }

//   /* ==========================================================
//    * ROOM ENDED — FINAL DECISION POINT
//    * ========================================================== */
//   async roomEnded(appointmentId, eventId) {
//     try {
//       const appt = await Appointment.findOne({ appointmentId });
//       if (!appt) return;

//       let finalStatus = "COMPLETED";

//       const patientJoined = appt.participantsJoined?.some(p =>
//         p.startsWith("patient-")
//       );

//       const doctorJoined = appt.participantsJoined?.some(p =>
//         p.startsWith("doctor-")
//       );

//       /* -----------------------------------------
//        * NEVER downgrade active consultation
//        * ----------------------------------------- */
//       if (appt.status !== "IN_CONSULTATION") {
//         if (!patientJoined && !doctorJoined) {
//           finalStatus = "MISSED";
//         } else if (patientJoined && !doctorJoined) {
//           finalStatus = "NO_SHOW";
//         }
//       }

//       await Appointment.updateOne(
//         { appointmentId },
//         {
//           $set: {
//             status: finalStatus,
//             twilioRoomStatus: "COMPLETED",
//             callEndedAt: new Date(),
//             updatedAt: new Date()
//           },
//           $addToSet: {
//             webhookEventsProcessed: eventId
//           }
//         }
//       );

//       /* -----------------------------------------
//        * 🔥 GUARANTEED doctor session cleanup
//        * ----------------------------------------- */
//       await DoctorSessionService.endSession(
//         appt.doctorUserId,
//         appt.appointmentId
//       );

//       logger.info("Room ended processed", {
//         appointmentId,
//         finalStatus,
//         patientJoined,
//         doctorJoined
//       });

//     } catch (err) {
//       logger.error("roomEnded error", err);
//     }
//   }

//   /* ==========================================================
//    * RECORDING COMPLETED
//    * ========================================================== */
//   async recordingCompleted(appointmentId, payload, eventId) {
//     try {
//       await Appointment.updateOne(
//         { appointmentId },
//         {
//           $set: {
//             recordingSid: payload.RecordingSid,
//             recordingUrl: payload.RecordingUrl,
//             recordingStoredAt: new Date(),
//             updatedAt: new Date()
//           },
//           $addToSet: {
//             webhookEventsProcessed: eventId
//           }
//         }
//       );

//       logger.info("Recording stored", { appointmentId });

//     } catch (err) {
//       logger.error("recordingCompleted error", err);
//     }
//   }

//   /* ==========================================================
//    * SAFE EVENT ID GENERATOR
//    * ========================================================== */
//   _generateEventId(payload, event, roomName) {
//     return (
//       payload.EventSid ||
//       payload.Sid ||
//       `${event}-${roomName}-${payload.Timestamp || Date.now()}`
//     );
//   }
// }

// export default new TwilioWebhookService();




import Appointment from "../models/Appointment.js";
import DoctorSessionService from "../services/DoctorSession.service.js";
import logger from "../utils/logger.js";

class TwilioWebhookService {
  /* ==========================================================
   * ENTRY POINT
   * ========================================================== */
  async handle(payload) {
    try {
      logger.info("Twilio Webhook Received", payload);

      const event =
        payload.StatusCallbackEvent ||
        payload.EventType ||
        payload.Event ||
        "";

      const roomName = payload.RoomName || payload.UniqueName;
      if (!roomName) {
        logger.warn("Webhook ignored — missing roomName");
        return;
      }

      if (!roomName.startsWith("consult_")) {
        logger.warn("Unknown roomName format", roomName);
        return;
      }

      const appointmentId = roomName.replace("consult_", "");
      const eventId = this._generateEventId(payload, event, roomName);

      /* ------------------------------------------------------
       * Idempotency check
       * ------------------------------------------------------ */
      if (eventId) {
        const alreadyProcessed = await Appointment.exists({
          appointmentId,
          webhookEventsProcessed: eventId
        });

        if (alreadyProcessed) {
          logger.info("Duplicate webhook ignored", { eventId });
          return;
        }
      }

      /* ------------------------------------------------------
       * Dispatch
       * ------------------------------------------------------ */
      switch (event.toLowerCase()) {

        case "room-created":
        case "room.in-progress":
          logger.info("Room created / alive", {
            appointmentId,
            roomStatus: payload.RoomStatus
          });
          break;

        case "participant-connected":
        case "participant.connected":
          await this.participantConnected(appointmentId, payload, eventId);
          break;

        case "room-ended":
        case "room.completed":
          await this.roomEnded(appointmentId, eventId);
          break;

        case "recording-completed":
        case "recording.completed":
          await this.recordingCompleted(appointmentId, payload, eventId);
          break;

        default:
          logger.info("Unhandled Twilio event", event);
      }

    } catch (err) {
      logger.error("Webhook Handler Error", {
        error: err.message,
        stack: err.stack
      });
    }
  }

  /* ==========================================================
   * PARTICIPANT CONNECTED (RACE-SAFE)
   * ========================================================== */
  async participantConnected(appointmentId, payload, eventId) {
    try {
      const identity = payload.ParticipantIdentity;
      if (!identity) return;

      /* ---------------------------------------
       * Phase 1: Always add participant
       * --------------------------------------- */
      await Appointment.updateOne(
        { appointmentId },
        {
          $addToSet: {
            participantsJoined: identity,
            webhookEventsProcessed: eventId
          },
          $set: {
            twilioRoomStatus: "IN_PROGRESS",
            updatedAt: new Date()
          }
        }
      );

      /* ---------------------------------------
       * Phase 2: Atomic transition to IN_CONSULTATION
       * Only ONE webhook can win this
       * --------------------------------------- */
          const transition = await Appointment.updateOne(
          {
            appointmentId,
            status: "ADMITTED",
            $and: [
              { participantsJoined: { $elemMatch: { $regex: "^doctor-" } } },
              { participantsJoined: { $elemMatch: { $regex: "^patient-" } } }
            ]
          },
          {
            $set: {
              status: "IN_CONSULTATION",
              consultationStartedAt: new Date()
            },
            $inc: { version: 1 }
          }
        );


      if (transition.modifiedCount === 1) {
        logger.info("Consultation officially started", { appointmentId });
      }

    } catch (err) {
      logger.error("participantConnected error", err);
    }
  }

  /* ==========================================================
   * ROOM ENDED — FINAL STATUS + CLEANUP
   * ========================================================== */
  async roomEnded(appointmentId, eventId) {
    try {
      const appt = await Appointment.findOne({ appointmentId });
      if (!appt) return;

      let finalStatus = "COMPLETED";

      const joined = appt.participantsJoined || [];
      const doctorJoined = joined.some(p => p.startsWith("doctor-"));
      const patientJoined = joined.some(p => p.startsWith("patient-"));

      /* -----------------------------------------
       * Never downgrade an active consultation
       * ----------------------------------------- */
      if (appt.status !== "IN_CONSULTATION") {
        if (!doctorJoined && !patientJoined) {
          finalStatus = "MISSED";
        } else if (patientJoined && !doctorJoined) {
          finalStatus = "NO_SHOW";
        }
      }

      await Appointment.updateOne(
        { appointmentId },
        {
          $set: {
            status: finalStatus,
            twilioRoomStatus: "COMPLETED",
            callEndedAt: new Date(),
            updatedAt: new Date()
          },
          $addToSet: {
            webhookEventsProcessed: eventId
          }
        }
      );

      /* -----------------------------------------
       * Guaranteed doctor session cleanup
       * ----------------------------------------- */
      await DoctorSessionService.endSession(
        appt.doctorUserId,
        appt.appointmentId
      );

      logger.info("Room ended processed", {
        appointmentId,
        finalStatus
      });

    } catch (err) {
      logger.error("roomEnded error", err);
    }
  }

  /* ==========================================================
   * RECORDING COMPLETED
   * ========================================================== */
  async recordingCompleted(appointmentId, payload, eventId) {
    try {
      await Appointment.updateOne(
        { appointmentId },
        {
          $set: {
            recordingSid: payload.RecordingSid,
            recordingUrl: payload.RecordingUrl,
            recordingStoredAt: new Date(),
            updatedAt: new Date()
          },
          $addToSet: {
            webhookEventsProcessed: eventId
          }
        }
      );

      logger.info("Recording stored", { appointmentId });

    } catch (err) {
      logger.error("recordingCompleted error", err);
    }
  }

  /* ==========================================================
   * SAFE EVENT ID GENERATOR
   * ========================================================== */
  _generateEventId(payload, event, roomName) {
    return (
      payload.EventSid ||
      payload.Sid ||
      `${event}-${roomName}-${payload.Timestamp || Date.now()}`
    );
  }
}

export default new TwilioWebhookService();







