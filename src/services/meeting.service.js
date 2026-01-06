import twilio from "twilio";
// import Appointment from "../models/Appointment.js";
import logger from "../utils/logger.js";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  TWILIO_AUTH_TOKEN
} = process.env;


const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

export const meetingService = {
  // Create room only when first person joins
  async ensureRoom(roomName) {
    console.log("roomname" , roomName);
    
    try {
      // Try fetching existing room
      const room = await twilioClient.video.v1.rooms(roomName).fetch();
      console.log("room" , room);
      
      return room;
    } catch (err) {
      // If room not found → create
      if (err.status === 404) {
        logger.info("Creating new Twilio room: " + roomName);
        return twilioClient.video.v1.rooms.create({
          uniqueName: roomName,
          type: "group",
        });
      }
      throw err;
    }
  },

   generateToken(identity, roomName, role) {
    

    const videoGrant = new VideoGrant({
  room: roomName,
});
console.log("videoGrant" , videoGrant);


const token = new AccessToken(
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  {identity: identity}
);
token.addGrant(videoGrant);


  return token.toJwt();
    

    
  }


  // generateToken(identity, roomName, role = "PATIENT", ttlSeconds = 3600) {
  //   try {
  //     const token = new AccessToken(
  //       TWILIO_ACCOUNT_SID,
  //       TWILIO_API_KEY,
  //       TWILIO_API_SECRET,
  //       { identity }
  //     );
  //     const grant = new VideoGrant({ room: roomName });
  //     token.addGrant(grant);

  //     // Attach minimal custom claims via `toJwt()` metadata if needed
  //     token.ttl = ttlSeconds;

  //     const jwt = token.toJwt();

  //     return {
  //       token: jwt,
  //       expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString()
  //     };
  //   } catch (err) {
  //     logger.error("generateToken error:", err);
  //     throw err;
  //   }
  // },
};


