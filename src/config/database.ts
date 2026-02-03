import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

function getDatabaseConfig(): DataSourceOptions {
  const dbType = process.env.DB_TYPE || 'mysql';
  const entities = [join(__dirname, '../', '**/**.entity{.ts,.js}')];

  if (dbType === 'sqlite') {
    const sqlitePath = process.env.DB_SQLITE_PATH || './data/nine-chat.sqlite';
    return {
      type: 'sqljs',
      location: sqlitePath,
      autoSave: true,
      entities,
      logging: false,
      synchronize: true,
    };
  }

  // 默认 MySQL
  return {
    type: 'mysql',
    port: parseInt(process.env.DB_PORT) || 3306,
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
    entities,
    logging: false,
    synchronize: true,
  };
}

export default getDatabaseConfig();
