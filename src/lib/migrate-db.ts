import fs from "fs"
import path from "path"
import { sql } from "@vercel/postgres"

const MIGRATION_SCHEMA = "migration"
const MIGRATION_TABLE = "migration"
const MIGRATIONS_FOLDER = "database-migrations"

const createMigrationSchemaAndTable = async () => {
  await sql`CREATE SCHEMA IF NOT EXISTS ${MIGRATION_SCHEMA}`
  await sql`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
}

const getAppliedMigrationNames = async () => {
  const { rows } = await sql`SELECT name FROM ${MIGRATION_SCHEMA}.${MIGRATION_TABLE}`
  return new Set(rows.map((row) => row.name))
}

const readMigrationNames = () => {
  const migrationsDir = path.join(process.cwd(), MIGRATIONS_FOLDER)
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
}

const applyMigration = async (name: string) => {
  const filePath = path.join(process.cwd(), MIGRATIONS_FOLDER, name)
  const migrationSql = fs.readFileSync(filePath, "utf-8")

  try {
    await sql.query(migrationSql)
    await sql`INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (name) VALUES (${name})`
    console.log(`Applied migration: ${name}`)
  } catch (error) {
    console.error(`Error applying migration ${name}:`, error)
    throw error
  }
}

export const migrateToLatest = async () => {
  await createMigrationSchemaAndTable()
  const appliedMigrationNames = await getAppliedMigrationNames()
  const migrationNames = readMigrationNames()

  for (const migrationName of migrationNames) {
    if (!appliedMigrationNames.has(migrationName)) {
      await applyMigration(migrationName)
    }
  }

  console.log("All migrations applied successfully.")
}
