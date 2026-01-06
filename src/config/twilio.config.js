import {configDotenv} from "dotenv"

configDotenv();

export default {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  apiKey: process.env.TWILIO_API_KEY,
  apiSecret: process.env.TWILIO_API_SECRET,
  tokenTtl: parseInt(process.env.TOKEN_TTL) || 3600,


  validateConfig(){
    const required = ['accountSid' ,'authToken', 'apiKey', 'apiSecret' ];
    const missing = required.filter(key => !this[key]);

    if(missing.length >0){
        throw new error(`Missing twilio configuration :${missing.join(', ')}`);


    }
    return true;
  }
}

