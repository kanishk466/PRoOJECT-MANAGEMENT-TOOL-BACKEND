import express from "express";
import { generateTestCases , getTestCasesByTicket } from "./testCase.controller.js";

const router = express.Router();

router.post(
  "/tickets/:id/generate-testcases",
  generateTestCases
);

router.get(
  "/tickets/:id/testcases",
  getTestCasesByTicket
);

export default router;