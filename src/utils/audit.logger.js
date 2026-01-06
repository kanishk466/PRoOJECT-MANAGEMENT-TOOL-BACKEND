import winston from "winston";
import fs from "fs";

const auditDir = "logs/audit";

if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true });
}

export const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(), // ✅ structured
  transports: [
    new winston.transports.File({
      filename: `${auditDir}/audit.log`,
      options: { flags: "a" } // ✅ append-only
    })
  ]
});
