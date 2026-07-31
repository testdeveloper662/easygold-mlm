const fs = require("fs");
const path = require("path");
const { sequelize } = require("../config/database");

async function runner() {
  try {
    // 1. Ensure `sequelize_migrations` tracking table exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`sequelize_migrations\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL UNIQUE,
        \`executed_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Fetch already executed migration file names
    const [executedRows] = await sequelize.query(
      "SELECT `name` FROM `sequelize_migrations`;"
    );
    const executedMigrations = new Set(executedRows.map((r) => r.name));

    // 3. Scan the src/migration directory for files
    const migrationsDir = __dirname;
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => {
        // Exclude runner script itself and non-js files
        return (
          file.endsWith(".js") &&
          file !== "db_deploy.js"
        );
      })
      .sort(); // Sort alphabetically (e.g. timestamps/001_..., 002_...)

    console.log("=== Starting Database Migration Runner ===");

    let ranCount = 0;

    for (const file of files) {
      if (executedMigrations.has(file)) {
        console.log(`⏩ Skipping already executed migration: ${file}`);
        continue;
      }

      console.log(`\n▶️ Executing migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);

      // Load module
      delete require.cache[require.resolve(filePath)];
      const migrationModule = require(filePath);

      // If module exports an async function or object with `up`, call it.
      if (typeof migrationModule === "function") {
        await migrationModule();
      } else if (migrationModule && typeof migrationModule.up === "function") {
        await migrationModule.up();
      }

      // Record migration execution in DB
      await sequelize.query(
        "INSERT INTO `sequelize_migrations` (`name`) VALUES (?);",
        { replacements: [file] }
      );

      console.log(`✅ Completed: ${file}`);
      ranCount++;
    }

    console.log("\n=============================================");
    if (ranCount === 0) {
      console.log("👍 Database is already up to date. No new migrations executed.");
    } else {
      console.log(`🎉 Successfully executed ${ranCount} new migration(s)!`);
    }
    console.log("=============================================");
  } catch (error) {
    console.error("❌ Migration failed with error:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

runner();
