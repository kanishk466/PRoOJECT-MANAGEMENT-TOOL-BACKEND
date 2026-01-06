import winston from "winston";
import winstonDailyRotate from "winston-daily-rotate-file";
import fs from "fs";

const logDir = "logs";

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const logger = winston.createLogger({
    level: "info",
    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat
    ),
    transports: [
        new winstonDailyRotate({
            filename: `${logDir}/app-%DATE%.log`,
            datePattern: "YYYY-MM-DD",
            maxFiles: "14d",
            zippedArchive: true
        }),
        new winstonDailyRotate({
            filename: `${logDir}/error-%DATE%.log`,
            level: "error",
            datePattern: "YYYY-MM-DD",
            maxFiles: "30d",
            zippedArchive: true
        })
    ]
});

// Console output
logger.add(
    new winston.transports.Console({
        format: combine(colorize(), logFormat)
    })
);

export default logger;
