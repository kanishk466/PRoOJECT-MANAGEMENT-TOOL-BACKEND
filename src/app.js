import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import twilioWebhookRouter from "./routes/twilio.webhook.js";
import meetRoutes from "./routes/meet.routes.js"
import { configDotenv } from "dotenv";

import { errorHandler } from "./utils/errorHandler.js";

const app = express();
configDotenv();
app.use(express.json());

app.use(cors());

connectDB();

// Routes
app.use("/api/appointment", appointmentRoutes);
app.use("/api", userRoutes);
app.use("/", twilioWebhookRouter);
app.use("/api/meet", meetRoutes)

app.get("/ping", (req, res) => {
  res.json({ status: "running" });
});

app.use(errorHandler);
export default app;
