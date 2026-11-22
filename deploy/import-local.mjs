import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire("/repo/apps/api/package.json");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const expected = JSON.parse(readFileSync("/tmp/counts.json", "utf8"));
const credentials = JSON.parse(readFileSync("/tmp/admin.json", "utf8"));
const origin = new URL(process.env.API_URL).origin;

if (
  !origin.startsWith("https://") ||
  typeof credentials.password !== "string" ||
  credentials.password.length < 32
) {
  throw new Error(
    "HTTPS and a strong replacement admin password are required."
  );
}

async function verifyCounts(db) {
  const tables = await db.$queryRawUnsafe("SHOW TABLES");
  const names = tables.map(row => Object.values(row)[0]).sort();
  if (JSON.stringify(names) !== JSON.stringify(Object.keys(expected).sort())) {
    throw new Error("Restored table set does not match the source database.");
  }
  for (const name of names) {
    if (!/^[a-z_]+$/.test(name)) throw new Error("Unexpected table name.");
    const rows = await db.$queryRawUnsafe(
      `SELECT COUNT(*) AS count FROM \`${name}\``
    );
    if (Number(rows[0].count) !== expected[name]) {
      throw new Error(`Restored row count differs for ${name}.`);
    }
  }
}

try {
  await prisma.$transaction(
    async db => {
      await verifyCounts(db);
      const admins = await db.adminUser.findMany({
        where: { status: "ACTIVE" },
      });
      const admin = admins.find(
        row => row.email === "admin@influentialminds.local"
      );
      if (!admin || admin.role !== "SUPER_ADMIN") {
        throw new Error(
          "The expected seeded administrator is missing; choose an account explicitly before importing."
        );
      }
      for (const row of admins) {
        if (row.id === admin.id) continue;
        for (const developmentPassword of [
          "ChangeMe123!",
          "change-this-password-now",
        ]) {
          if (await bcrypt.compare(developmentPassword, row.passwordHash)) {
            throw new Error(
              "Another imported administrator still uses a development password."
            );
          }
        }
      }
      await db.adminUser.update({
        where: { id: admin.id },
        data: { passwordHash: await bcrypt.hash(credentials.password, 12) },
      });

      // Rewrite only deployment-local URL prefixes; editorial text and identifiers stay intact.
      const columns = await db.$queryRawUnsafe(
        "SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()"
      );
      for (const { tableName, columnName } of columns) {
        if (!/^[a-z_]+$/.test(tableName) || !/^[a-zA-Z_]+$/.test(columnName)) {
          throw new Error("Unexpected schema identifier.");
        }
        if (!/(?:url|sourcePage)$/i.test(columnName)) continue;
        const rows = await db.$queryRawUnsafe(
          `SELECT DISTINCT \`${columnName}\` AS value FROM \`${tableName}\` WHERE \`${columnName}\` LIKE 'http://localhost%' OR \`${columnName}\` LIKE 'http://127.0.0.1%'`
        );
        for (const { value } of rows) {
          const replacement = value.replace(
            /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?=\/|$)/,
            origin
          );
          if (replacement !== value) {
            await db.$executeRawUnsafe(
              `UPDATE \`${tableName}\` SET \`${columnName}\` = ? WHERE \`${columnName}\` = ?`,
              replacement,
              value
            );
          }
        }
      }
      await verifyCounts(db);
    },
    { timeout: 120000 }
  );
  console.log(
    "Verified every imported table; replaced local URLs and rotated the seeded admin password."
  );
} finally {
  await prisma.$disconnect();
}
