// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient({
//   log: ["error", "warn"]
// });

// export default prisma;

import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

export default prisma;
