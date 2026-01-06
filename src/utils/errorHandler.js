import logger from "./logger.js";

export const errorHandler = (err, req, res, next) => {
    logger.error(err.stack || err.message);

    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: err.message
    });
};
