import twilio from "twilio";
import logger from "../utils/logger.js";

const client = twilio(
  process.env.TWILIO_API_KEY,
  process.env.TWILIO_API_SECRET,
  { accountSid: process.env.TWILIO_ACCOUNT_SID }
);

class TwilioRoomService {
  
  /* ---------------------------------------------------
   * 1. Get Twilio Room Details
   * --------------------------------------------------- */
  async getRoomDetails(roomSid) {
    try {
      const room = await client.video.v1.rooms(roomSid).fetch();
      logger.info("Room Details Fetched", { roomSid });
      return room;
    } catch (err) {
      logger.error("Failed to fetch room details", err);
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 2. List Participants of Room
   * --------------------------------------------------- */
  async getRoomParticipants(roomSid) {
    try {
      const participants = await client.video.v1.rooms(roomSid).participants.list();
      logger.info("Room Participants Fetched", { roomSid });
      return participants;
    } catch (err) {
      logger.error("Failed to fetch participants", err);
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 3. Get All Recordings of a Room
   * --------------------------------------------------- */
  async getRoomRecordings(roomSid) {
    try {
      const recordings = await client.video.v1.recordings.list({
        groupingSid: [roomSid]
      });

      logger.info("Room Recordings Fetched", { roomSid });
      return recordings;
    } catch (err) {
      logger.error("Failed to fetch recordings", err);
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 4. Get Direct Download URL for a Recording
   * --------------------------------------------------- */
  async getRecordingDownloadUrl(recordingSid) {
    try {
      const media = await client.video.v1.recordings(recordingSid).media.fetch();
      logger.info("Recording Download URL Fetched", { recordingSid });

      return media.redirectTo; // Twilio generates a temporary signed URL
    } catch (err) {
      logger.error("Failed to fetch recording download URL", err);
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 5. Get Recording Rules
   * --------------------------------------------------- */
  async getRecordingRules(roomSid) {
    try {
      const rules = await client.video.v1.rooms(roomSid).recordingRules().fetch();
      logger.info("Recording Rules Fetched", { roomSid });
      return rules;
    } catch (err) {
      logger.error("Failed to fetch recording rules", err);
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 6. Update Recording Rules
   * --------------------------------------------------- */
  async updateRecordingRules(roomSid, rules) {
    try {
      const updated = await client.video.v1.rooms(roomSid)
        .recordingRules()
        .update({ rules });

      logger.info("Recording Rules Updated", { roomSid });
      return updated;
    } catch (err) {
      logger.error("Failed to update recording rules", err);
      throw err;
    }
  }

  /* ---------------------------------------------------
   * 7. Fetch Transcriptions
   * --------------------------------------------------- */
  async getRoomTranscriptions(roomSid) {
    try {
      const transcriptions = await client.video.v1.rooms(roomSid)
        .transcriptions
        .list();

      logger.info("Transcriptions Fetched", { roomSid });
      return transcriptions;
    } catch (err) {
      logger.error("Failed to fetch transcriptions", err);
      throw err;
    }
  }
}

export default new TwilioRoomService();
