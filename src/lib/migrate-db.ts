import fs from "fs";
import path from "path";
import { sql } from "@vercel/postgres";

const MIGRATIONS_FOLDER = "db-migrations";
const MIGRATION_SCHEMA = "migration";
const MIGRATION_TABLE = "migration";

const ensureMigrationTable = async () => {
  console.log("Ensuring migration table exists...");
  await sql.query(`
    CREATE SCHEMA IF NOT EXISTS ${MIGRATION_SCHEMA};
    CREATE TABLE IF NOT EXISTS ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const getAppliedMigrations = async () => {
  console.log("Fetching applied migrations...");
  await ensureMigrationTable();
  const { rows } = await sql`
    SELECT name FROM ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} ORDER BY applied_at
  `;
  return new Set(rows.map(row => row.name));
};

const readMigrationFiles = () => {
  console.log("Reading migration files...");
  const migrationsDir = path.join(process.cwd(), MIGRATIONS_FOLDER);
  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(file => ({
      name: file,
      content: fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    }));
};

const applyMigration = async (name: string, content: string) => {
  console.log(`Applying migration: ${name}`);
  try {
    await sql.query(content);
    await sql`
      INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (name) VALUES (${name})
    `;
    console.log(`Migration applied successfully: ${name}`);
  } catch (error) {
    console.error(`Error applying migration ${name}:`, error);
    throw error;
  }
};

export async function migrateToLatest() {
  console.log("Starting migration process...");
  const appliedMigrations = await getAppliedMigrations();
  const migrations = readMigrationFiles();

  for (const migration of migrations) {
    if (!appliedMigrations.has(migration.name)) {
      console.log(`Applying migration: ${migration.name}`);
      await applyMigration(migration.name, migration.content);
    } else {
      console.log(`Skipping already applied migration: ${migration.name}`);
    }
  }

  console.log("Migration process completed.");
}

export async function checkAppliedMigrations() {
  console.log("Checking applied migrations...");
  try {
    await ensureMigrationTable();
    const { rows } = await sql`
      SELECT name, applied_at 
      FROM ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} 
      ORDER BY applied_at
    `;
    console.log("Applied migrations:", rows);
    return rows;
  } catch (error) {
    console.error("Error checking applied migrations:", error);
    throw error;
  }
}





// import fs from "fs";
// import path from "path";
// import { sql } from "@vercel/postgres";

// const MIGRATIONS_FOLDER = "database-migrations";

// const readMigrationFiles = () => {
//   const migrationsDir = path.join(process.cwd(), MIGRATIONS_FOLDER);
//   return fs.readdirSync(migrationsDir)
//     .filter(file => file.endsWith('.sql'))
//     .sort()
//     .map(file => ({
//       name: file,
//       content: fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
//     }));
// };

// const applyMigration = async (migrationContent: string) => {
//   try {
//     await sql.query(migrationContent);
//     console.log(`Migration applied successfully`);
//   } catch (error) {
//     console.error(`Error applying migration:`, error);
//     throw error;
//   }
// };

// export async function migrateToLatest() {
//   console.log("Starting migration process...");
//   const migrations = readMigrationFiles();

//   for (const migration of migrations) {
//     console.log(`Applying migration: ${migration.name}`);
//     await applyMigration(migration.content);
//   }

//   console.log("Migration process completed.");
// }





// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import { sql } from "@vercel/postgres";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const MIGRATION_SCHEMA = "migration";
// const MIGRATION_TABLE = "migration";
// const MIGRATIONS_FOLDER = "database-migrations";

// const getAppliedMigrationNames = async () => {
//   console.log("Fetching applied migration names...");
//   try {
//     const { rows } = await sql`
//       SELECT name FROM ${MIGRATION_SCHEMA}.${MIGRATION_TABLE}
//     `;
//     console.log(`Found ${rows.length} applied migrations.`);
//     return new Set(rows.map((row) => row.name));
//   } catch (error) {
//     if (
//       (error as Error).message.includes(
//         'relation "migration.migration" does not exist'
//       )
//     ) {
//       console.log(
//         "Migration table does not exist yet. This is expected for the first run."
//       );
//       return new Set();
//     }
//     throw error;
//   }
// };

// const readMigrationNames = () => {
//   console.log("Reading migration files...");
//   const migrationsDir = path.join(process.cwd(), MIGRATIONS_FOLDER);
//   const files = fs
//     .readdirSync(migrationsDir)
//     .filter((file) => file.endsWith(".sql"))
//     .sort();
//   console.log(`Found ${files.length} migration files.`);
//   return files;
// };

// const validateMigrationSequence = (migrationNames: string[]) => {
//   console.log("Validating migration sequence...");
//   let lastId = 0;
//   for (const name of migrationNames) {
//     const match = name.match(/^(\d+)-/);
//     if (!match) {
//       throw new Error(`Invalid migration file name format: ${name}`);
//     }
//     const id = parseInt(match[1], 10);
//     if (id !== lastId + 1) {
//       throw new Error(
//         `Invalid migration sequence: Expected ${
//           lastId + 1
//         }, but found ${id} in ${name}`
//       );
//     }
//     lastId = id;
//   }
//   console.log("Migration sequence is valid.");
// };

// const applyMigration = async (name: string) => {
//   console.log(`Applying migration: ${name}`);
//   const filePath = path.join(process.cwd(), MIGRATIONS_FOLDER, name);
//   const migrationSql = fs.readFileSync(filePath, "utf-8");

//   try {
//     await sql.query(migrationSql);
//     await sql`INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (name) VALUES (${name})`;
//     console.log(`Migration applied successfully: ${name}`);
//   } catch (error) {
//     console.error(`Error applying migration ${name}:`, error);
//     throw error;
//   }
// };

// const testConnection = async () => {
//   try {
//     const result = await sql`SELECT NOW()`;
//     console.log("Database connection successful:", result.rows[0]);
//   } catch (error) {
//     console.error("Database connection failed:", error);
//     process.exit(1);
//   }
// };

// export const migrateToLatest = async () => {
//   console.log("Starting migration process...");
//   await testConnection();
//   const appliedMigrationNames = await getAppliedMigrationNames();
//   const migrationNames = readMigrationNames();

//   validateMigrationSequence(migrationNames);

//   for (const migrationName of migrationNames) {
//     if (!appliedMigrationNames.has(migrationName)) {
//       await applyMigration(migrationName);
//     } else {
//       console.log(`Migration already applied: ${migrationName}`);
//     }
//   }

//   console.log("Migration process completed.");
// };

// // // Call the migration function
// // migrateToLatest().catch((error) => {
// //   console.error("Migration failed:", error);
// //   process.exit(1);
// // });
