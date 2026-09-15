import { readFileSync } from "node:fs";
import pg from "pg";

const { Client } = pg;
const env = readFileSync(".env", "utf8");
const match = env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m);
const connectionString = match[1].replace("&channel_binding=require", "");

const sql = `
CREATE TABLE IF NOT EXISTS "user" (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

const client = new Client({ connectionString });
await client.connect();
await client.query(sql);
const { rows } = await client.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'user\' ORDER BY ordinal_position');
console.log(JSON.stringify(rows, null, 2));
await client.end();