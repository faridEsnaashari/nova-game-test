/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { MongoClient } from 'mongodb';

// use .env or .env.test depending on NODE_ENV variable
const envPath = path.resolve(
  __dirname,
  process.env.NODE_ENV === 'test' ? '../.env.test' : '../.env',
);
dotenv.config({ path: envPath });

export async function getMongoMigrator() {
  const client = new MongoClient(process.env.MONGO_DB_URL + '');
  await client.connect();

  const database = client.db(process.env.DB_NAME);

  return {
    client,
    database,
  };
}
