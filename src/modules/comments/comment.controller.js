import asyncHandler from "express-async-handler";
import {
  createCommentSchema,
  updateCommentSchema,
  
} from "./comment.validation.js";
import {
  createCommentService,
  listCommentsService,
  deleteCommentService,updateCommentService
} from "./comment.service.js";

export const createComment = asyncHandler(async (req, res) => {
  const { error, value } = createCommentSchema.validate(req.body);
  if (error) throw new Error(error.details[0].message);

  const comment = await createCommentService({
    ticketId: req.params.ticketId,
    content: value.content,
    user: req.user,
  });

  res.status(201).json({ message: "Comment added", comment });
});

export const listComments = asyncHandler(async (req, res) => {
  const comments = await listCommentsService(req.params.ticketId);
  res.json({ comments });
});


export const updateComment = asyncHandler(async (req, res) => {
  const { error, value } = updateCommentSchema.validate(req.body);
  if (error) throw new Error(error.details[0].message);

  const comment = await updateCommentService({
    commentId: req.params.commentId,
    content: value.content,
    user: req.user,
  });

  res.json({
    message: "Comment updated successfully",
    comment,
  });
});

export const deleteComment = asyncHandler(async (req, res) => {
  await deleteCommentService({
    commentId: req.params.commentId,
    user: req.user,
  });

  res.json({
    message: "Comment deleted successfully",
  });
});

