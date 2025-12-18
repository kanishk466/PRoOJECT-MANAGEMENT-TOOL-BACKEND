import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import {
  createComment,
  listComments,
  updateComment,deleteComment
} from "./comment.controller.js";

const router = express.Router();

router.get(
  "/tickets/:ticketId/comments",
  authMiddleware,
  listComments
);

router.post(
  "/tickets/:ticketId/comments",
  authMiddleware,
  createComment
);



router.patch(
  "/comments/:commentId",
  authMiddleware,
  updateComment
);

// Delete comment
router.delete(
  "/comments/:commentId",
  authMiddleware,
  deleteComment
);
export default router;
