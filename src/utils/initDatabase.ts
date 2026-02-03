import { Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

export function initDatabase() {
  const dbType = process.env.DB_TYPE || 'mysql';

  if (dbType === 'sqlite') {
    // SQLite: 确保目录存在
    const sqlitePath = process.env.DB_SQLITE_PATH || './data/nine-chat.sqlite';
    const dir = path.dirname(sqlitePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      Logger.log(`SQLite 目录已创建: ${dir}`);
    }
    return;
  }

  // MySQL 逻辑保持不变
  try {
    mysql
      .createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        port: parseInt(process.env.DB_PORT),
      })
      .then(async (conn) => {
        const [rows] = await conn.execute(`SHOW DATABASES LIKE '${process.env.DB_DATABASE}'`);
        if (Array.isArray(rows) && rows.length === 0) {
          await conn.execute(`CREATE DATABASE \`${process.env.DB_DATABASE}\``);
          Logger.log(`数据库自动创建成功 ${process.env.DB_DATABASE}`);
        }
        await conn.end();
      })
      .catch((err) => {
        console.log('自动创建数据库失败，请确认你使用的是root权限 否则请手动创建数据库: ', err);
      });
  } catch (error) {
    console.log('auto create database err : ', error);
  }
}
