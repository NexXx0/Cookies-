import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function findEnvValue(key: string): string {
  const current = process.env[key]?.trim();
  if (current) return current;

  const tried = new Set<string>();
  const candidates: string[] = [];
  let dir = process.cwd();

  for (let i = 0; i < 8; i += 1) {
    candidates.push(path.join(dir, ".env"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const filePath of candidates) {
    if (tried.has(filePath)) continue;
    tried.add(filePath);

    const parsed = parseEnvFile(filePath);
    const value = parsed[key]?.trim();
    if (value) {
      process.env[key] = value;
      return value;
    }
  }

  return "";
}

let databaseUrl = findEnvValue("DATABASE_URL");

if (!databaseUrl) {
  databaseUrl = "postgresql://invalid:invalid@localhost:5432/invalid";
}

const isRemote = !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
if (isRemote) {
  if (!/sslmode=/i.test(databaseUrl)) {
    databaseUrl += `${databaseUrl.includes("?") ? "&" : "?"}sslmode=require`;
  }
  if (!/uselibpqcompat=/i.test(databaseUrl)) {
    databaseUrl += `${databaseUrl.includes("?") ? "&" : "?"}uselibpqcompat=true`;
  }
}

const adapter = new PrismaPg({ connectionString: databaseUrl });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
