import { get } from 'env-var';
import '../libs/utils/dotenv';

export const databaseConfig = {
  connectionString: get('MONGO_DB_URL').required().asString(),
  database: get('DB_NAME').required().asString(),
};

export const mongoConnectionUri =
  databaseConfig.connectionString + '/' + databaseConfig.database;
