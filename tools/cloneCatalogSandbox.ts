import "dotenv/config";

import { execute } from "../server/db";

const BASE_TABLES = [
  "users",
  "admin_users",
  "containers",
  "container_photos",
  "import_history",
  "catalog_sync_settings",
] as const;

function getArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  return raw ? raw.slice(prefix.length).trim() : undefined;
}

function quoteName(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``;
}

function quoteString(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await execute(`SHOW TABLES LIKE ${quoteString(tableName)}`);
  return (((result as any)?.[0] ?? []) as unknown[]).length > 0;
}

async function getRowCount(tableName: string): Promise<number> {
  const result = await execute(`SELECT COUNT(*) AS count FROM ${quoteName(tableName)}`);
  const rows = (((result as any)?.[0] ?? []) as Array<{ count?: number | string }>);
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const sourcePrefix = (getArg("--source-prefix") ?? process.env.CATALOG_TABLE_PREFIX ?? "").trim();
  const targetPrefix = (getArg("--target-prefix") ?? "").trim();
  const force = process.argv.includes("--force");

  if (!targetPrefix) {
    throw new Error("Missing required --target-prefix=<prefix>");
  }

  if (sourcePrefix === targetPrefix) {
    throw new Error("Source prefix and target prefix must differ");
  }

  const tables = BASE_TABLES.map((baseName) => ({
    baseName,
    source: `${sourcePrefix}${baseName}`,
    target: `${targetPrefix}${baseName}`,
  }));

  for (const table of tables) {
    const exists = await tableExists(table.source);
    if (!exists) {
      throw new Error(`Source table does not exist: ${table.source}`);
    }
  }

  const summary: Array<{ table: string; sourceRows: number; targetRows: number }> = [];

  for (const table of tables) {
    if (force) {
      await execute(`DROP TABLE IF EXISTS ${quoteName(table.target)}`);
    } else if (await tableExists(table.target)) {
      throw new Error(`Target table already exists: ${table.target}. Use --force to recreate it.`);
    }

    await execute(`CREATE TABLE ${quoteName(table.target)} LIKE ${quoteName(table.source)}`);
    await execute(`INSERT INTO ${quoteName(table.target)} SELECT * FROM ${quoteName(table.source)}`);

    summary.push({
      table: table.baseName,
      sourceRows: await getRowCount(table.source),
      targetRows: await getRowCount(table.target),
    });
  }

  console.log(
    JSON.stringify(
      {
        sourcePrefix,
        targetPrefix,
        clonedTables: summary,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(message);
    process.exit(1);
  });
