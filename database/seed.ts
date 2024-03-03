/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { getMongoMigrator } from './getMigrator';
import mongoSeeds from './seeds.seed';

async function mongoSeeder() {
  const { client, database } = await getMongoMigrator();

  await Promise.all(
    mongoSeeds.map(async (mongoSeed) => {
      const collectionName = Object.keys(mongoSeed)[0];
      const value = Object.values(mongoSeed)[0];

      const collection = database.collection(collectionName);

      await collection.insertMany(value);
    }),
  ).finally(() => client.close());
}

mongoSeeder();
