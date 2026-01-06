// routes/twilioWebhook.route.js
import express from "express";
import TelemedicineWebhookService from "../services/telemedicineWebhook.service.js";

const router = express.Router();

// router.post(
//   "/twilio/webhook", express.urlencoded({ extended: true }),
//   async (req, res) => {
//     console.log("\n🔥 TWILIO WEBHOOK HIT 🔥");
//     console.log("Headers:", req.headers);
//     console.log("Body:", req.body);

//     try {
//       await TelemedicineWebhookService.handle(req.body);
//       return res.status(200).send("OK");
//     } catch (err) {
//       console.error("Webhook error:", err);
//       return res.status(500).json({ error: "Server error" });
//     }
//   }
// );


router.post(
  "/twilio/webhook", express.urlencoded({ extended: true }),
  async (req, res) => {
    console.log("\n🔥 TWILIO WEBHOOK HIT 🔥");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

     try {
    await TelemedicineWebhookService.handle(req.body);
    res.status(200).send("OK");
  } catch (err) {
    logger.error("Twilio Webhook Controller Error", err);
    res.status(500).send("Webhook Error");
  }
  }
);






export default router;
