// this script is run during vercel build process to set up the db
const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  const client = new Client({
    connectionString: postgresUrl,
  });

  try {
    await client.connect();

    await client.query(`CREATE SCHEMA IF NOT EXISTS migrations;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations.applied_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationFiles = await fs.readdir(
      path.join(__dirname, "../db/migrations")
    );

    for (const file of migrationFiles.sort()) {
      const [_, migrationName] = file.match(/^(\d+_.+)\.sql$/) || [];

      if (migrationName) {
        const { rows } = await client.query(
          "SELECT * FROM migrations.applied_migrations WHERE name = $1",
          [migrationName]
        );

        if (rows.length === 0) {
          const migrationSQL = await fs.readFile(
            path.join(__dirname, "../db/migrations", file),
            "utf8"
          );
          await client.query(migrationSQL);

          await client.query("INSERT INTO migrations.applied_migrations (name) VALUES ($1)", [
            migrationName,
          ]);

          console.log(`Applied migration: ${migrationName}`);
        }
      }
    }

    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigrations().catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});


// const { Client } = require("pg");
// const fs = require("fs").promises;
// const path = require("path");

// async function runMigrations() {
//   const client = new Client({
//     connectionString: process.env.POSTGRES_URL,
//   });

//   try {
//     await client.connect();

//     // Create migrations schema
//     await client.query(`CREATE SCHEMA IF NOT EXISTS migrations;`);

//     // Create migrations table in the migrations schema
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS migrations.applied_migrations (
//         id SERIAL PRIMARY KEY,
//         name VARCHAR(255) NOT NULL,
//         applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       )
//     `);

//     // Get list of migration files
//     const migrationFiles = await fs.readdir(
//       path.join(__dirname, "../db/migrations")
//     );

//     for (const file of migrationFiles.sort()) {
//       const [_, migrationName] = file.match(/^(\d+_.+)\.sql$/) || [];

//       if (migrationName) {
//         // Check if migration has been applied
//         const { rows } = await client.query(
//           "SELECT * FROM migrations.applied_migrations WHERE name = $1",
//           [migrationName]
//         );

//         if (rows.length === 0) {
//           // Run migration
//           const migrationSQL = await fs.readFile(
//             path.join(__dirname, "../db/migrations", file),
//             "utf8"
//           );
//           await client.query(migrationSQL);

//           // Log migration
//           await client.query("INSERT INTO migrations.applied_migrations (name) VALUES ($1)", [
//             migrationName,
//           ]);

//           console.log(`Applied migration: ${migrationName}`);
//         }
//       }
//     }

//     console.log("All migrations completed successfully");
//   } catch (error) {
//     console.error("Error running migrations:", error);
//     throw error;
//   } finally {
//     await client.end();
//   }
// }

// runMigrations().catch((error) => {
//   console.error("Migration script failed:", error);
//   process.exit(1);
// });