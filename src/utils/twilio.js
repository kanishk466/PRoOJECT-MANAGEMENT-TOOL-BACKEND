// import Twilio from "twilio";
// import { v4 as uuidv4 } from "uuid";

// const client = Twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_API_KEY_SECRET
// );

// export const createTwilioRoom = async (roomName) => {
//   return await client.video.v1.rooms.create({
//     uniqueName: roomName,
//     type: "group",
//     recordParticipantsOnConnect: false,
//   });
// };

// export const generateToken = (identity, roomName) => {
//   const { AccessToken } = Twilio.jwt;
//   const { VideoGrant } = AccessToken;

//   const token = new AccessToken(
//     process.env.TWILIO_ACCOUNT_SID,
//     process.env.TWILIO_API_KEY,
//     process.env.TWILIO_API_SECRET,
//     { identity }
//   );

//   token.addGrant(new VideoGrant({ room: roomName }));
//   token.ttl = 60 * 15; // 15 minutes

//   return token.toJwt();
// };


// ----------------------------------------------------version 2----------------------

// utils/twilio.js
import Twilio from "twilio";
import logger from "./logger.js";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const API_KEY_SID = process.env.TWILIO_API_KEY;
const API_KEY_SECRET = process.env.TWILIO_API_SECRET;

export const twilioClient = Twilio(API_KEY_SID, API_KEY_SECRET, { accountSid: ACCOUNT_SID });

// create room (idempotent: if exists, returns existing)
export const createTwilioRoom = async (roomName) => {
  try {
    const room = await twilioClient.video.v1.rooms.create({
      uniqueName: roomName,
      type: "group",
      recordParticipantsOnConnect: false,
    });
    return room;
  } catch (err) {
    // if already exists (Twilio error code or message may vary), try fetch
    logger.warn("createTwilioRoom error: " + (err.message || err));
    try {
      const r = await getTwilioRoom(roomName);
      if (r) return r;
    } catch (e) {
      logger.error("createTwilioRoom - fetch fallback failed: " + e.message);
    }
    throw err;
  }
};

export const getTwilioRoom = async (roomName) => {
  try {
    const room = await twilioClient.video.v1.rooms(roomName).fetch();
    return room;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
};

export const endTwilioRoom = async (roomName) => {
  try {
    const room = await twilioClient.video.v1.rooms(roomName).update({ status: "completed" });
    return room;
  } catch (err) {
    logger.warn("endTwilioRoom error: " + (err.message || err));
    // swallowing 404 or already ended
    return null;
  }
};

export const generateTwilioToken = ( identity, roomName, ttlSecs = 15 * 60 ) => {
  const { AccessToken } = Twilio.jwt;
  const { VideoGrant } = AccessToken;

  console.log("ide", identity);
  
  const token = new AccessToken(ACCOUNT_SID, API_KEY_SID, API_KEY_SECRET, { identity });
  token.addGrant(new VideoGrant({ room: roomName }));
  token.ttl = ttlSecs;
  return token.toJwt();
};
