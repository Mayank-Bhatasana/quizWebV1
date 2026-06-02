import { prisma } from "./lib/prisma.js";

async function main() {
  const user = await prisma.user.create({
    data: {
      email: "test@test.com",
      passwordHash: "example-hash",
      profile: {
        create: {
          username: "Mayank",
        },
      },
    },
    include: {
      profile: true,
    },
  });

  console.log(user.profile);
}

main();
