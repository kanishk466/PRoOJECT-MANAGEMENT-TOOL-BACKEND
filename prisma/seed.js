import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password@123", 10);

  // Manager
  const manager = await prisma.user.upsert({
    where: { email: "manager@giloys.com" },
    update: {},
    create: {
      email: "manager@giloys.com",
      passwordHash: password,
      name: "RPM Manager",
      role: "MANAGER",
    },
  });

  // Developer 1
  const dev1 = await prisma.user.upsert({
    where: { email: "dev1@giloys.com" },
    update: {},
    create: {
      email: "dev1@giloys.com",
      passwordHash: password,
      name: "Developer One",
      role: "DEVELOPER",
    },
  });

  // Developer 2
  const dev2 = await prisma.user.upsert({
    where: { email: "dev2@giloys.com" },
    update: {},
    create: {
      email: "dev2@giloys.com",
      passwordHash: password,
      name: "Developer Two",
      role: "DEVELOPER",
    },
  });

  // Tester
  const tester = await prisma.user.upsert({
    where: { email: "tester@giloys.com" },
    update: {},
    create: {
      email: "tester@giloys.com",
      passwordHash: password,
      name: "QA Tester",
      role: "TESTER",
    },
  });

  console.log("Seeded users:");
  console.table([
    manager.email,
    dev1.email,
    dev2.email,
    tester.email,
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
