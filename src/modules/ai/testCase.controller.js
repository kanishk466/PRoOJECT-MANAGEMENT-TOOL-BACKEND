import prisma from "../../config/prisma.js";
import { generateTestCasesFromAI } from "./aiTestCase.service.js";

// export const generateTestCases = async (req, res) => {
//   try {
//     const ticketId = parseInt(req.params.id);

//     const ticket = await prisma.ticket.findUnique({
//       where: { id: ticketId }
//     });

//     if (!ticket) {
//       return res.status(404).json({ message: "Ticket not found" });
//     }

//     if (ticket.status !== "RESOLVED") {
//       return res.status(400).json({
//         message: "Test cases allowed only for RESOLVED tickets"
//       });
//     }

//     if (ticket.aiTestGenerated) {
//       return res.status(400).json({
//         message: "Test cases already generated"
//       });
//     }

//     if (!ticket.description || ticket.description.length < 20) {
//       return res.status(400).json({
//         message: "Insufficient ticket description"
//       });
//     }

//     // Call AI
//     const aiTestCases = await generateTestCasesFromAI(ticket);
//     console.log("AI generated test cases:", aiTestCases);

//     // Save in DB
//     await prisma.testCase.createMany({
//       data: aiTestCases.map(tc => ({
//         ticketId: ticket.id,
//         title: tc.title,
//         type: tc.type,
//         preconditions: tc.preconditions,
//         steps: tc.steps,
//         expectedResult: tc.expectedResult,
//         priority: tc.priority,
//       }))
//     });

//     // Mark ticket
//     await prisma.ticket.update({
//       where: { id: ticket.id },
//       data: { aiTestGenerated: true }
//     });

//     return res.json({ success: true });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       message: "Failed to generate test cases"
//     });
//   }
// };

export const generateTestCases = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    

    if (isNaN(ticketId)) {
      return res.status(400).json({ message: "Invalid ticket id" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.status !== "RESOLVED") {
      return res.status(400).json({
        message: "Test cases allowed only for RESOLVED tickets"
      });
    }

    if (ticket.aiTestGenerated) {
      return res.status(400).json({
        message: "Test cases already generated"
      });
    }

    if (!ticket.description || ticket.description.length < 20) {
      return res.status(400).json({
        message: "Insufficient ticket description"
      });
    }

    const { data, modelUsed } = await generateTestCasesFromAI(ticket);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(500).json({
        message: "AI returned invalid test cases"
      });
    }

    await prisma.$transaction(async (tx) => {

      await tx.testCase.createMany({
        data: data.map(tc => ({
          ticketId: ticket.id,
          title: tc.title,
          type: tc.type,
          preconditions: tc.preconditions,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          priority: tc.priority,
        }))
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { aiTestGenerated: true }
      });

    });

    return res.json({
      success: true,
      modelUsed,
      insertedCount: data.length
    });

  } catch (error) {
    console.error("Generate Test Cases Error:", error);

    return res.status(500).json({
      message: "Failed to generate test cases"
    });
  }
};


export const getTestCasesByTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        testCases: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found"
      });
    }

    return res.json({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      testCases: ticket.testCases
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to fetch test cases"
    });
  }
};