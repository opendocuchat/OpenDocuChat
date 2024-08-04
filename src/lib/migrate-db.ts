import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "@vercel/postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATION_SCHEMA = "migration";
const MIGRATION_TABLE = "migration";
const MIGRATIONS_FOLDER = "database-migrations";

const createMigrationSchemaAndTable = async () => {
  console.log("Creating migration schema and table...");
  try {
    await sql`CREATE SCHEMA IF NOT EXISTS migration`;
  } catch (error) {
    console.error("Error creating migration schema:", error);
    throw error;
  }
  await sql`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log("Migration schema and table created successfully.");
};

const getAppliedMigrationNames = async () => {
  console.log("Fetching applied migration names...");
  const { rows } = await sql`SELECT name FROM ${MIGRATION_SCHEMA}.${MIGRATION_TABLE}`;
  console.log(`Found ${rows.length} applied migrations.`);
  return new Set(rows.map((row) => row.name));
};

const readMigrationNames = () => {
  console.log("Reading migration files...");
  const migrationsDir = path.join(process.cwd(), MIGRATIONS_FOLDER);
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
  console.log(`Found ${files.length} migration files.`);
  return files;
};

const validateMigrationSequence = (migrationNames: string[]) => {
  console.log("Validating migration sequence...");
  let lastId = 0;
  for (const name of migrationNames) {
    const match = name.match(/^(\d+)-/);
    if (!match) {
      throw new Error(`Invalid migration file name format: ${name}`);
    }
    const id = parseInt(match[1], 10);
    if (id !== lastId + 1) {
      throw new Error(
        `Invalid migration sequence: Expected ${lastId + 1}, but found ${id} in ${name}`
      );
    }
    lastId = id;
  }
  console.log("Migration sequence is valid.");
};

const applyMigration = async (name: string) => {
  console.log(`Applying migration: ${name}`);
  const filePath = path.join(process.cwd(), MIGRATIONS_FOLDER, name);
  const migrationSql = fs.readFileSync(filePath, "utf-8");

  try {
    await sql.query(migrationSql);
    await sql`INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (name) VALUES (${name})`;
    console.log(`Migration applied successfully: ${name}`);
  } catch (error) {
    console.error(`Error applying migration ${name}:`, error);
    throw error;
  }
};

const testConnection = async () => {
  try {
    const result = await sql`SELECT NOW()`;
    console.log("Database connection successful:", result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

export const migrateToLatest = async () => {
  console.log("Starting migration process...");
  await testConnection();
  await createMigrationSchemaAndTable();
  const appliedMigrationNames = await getAppliedMigrationNames();
  const migrationNames = readMigrationNames();

  validateMigrationSequence(migrationNames);

  for (const migrationName of migrationNames) {
    if (!appliedMigrationNames.has(migrationName)) {
      await applyMigration(migrationName);
    } else {
      console.log(`Migration already applied: ${migrationName}`);
    }
  }

  console.log("Migration process completed.");
};

// Call the migration function
migrateToLatest().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});