import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const results = await db.select({
  id: schema.containers.id,
  externalId: schema.containers.externalId,
  name: schema.containers.name,
  size: schema.containers.size,
  description: schema.containers.description,
}).from(schema.containers).limit(5);

console.log(JSON.stringify(results, null, 2));
await connection.end();
