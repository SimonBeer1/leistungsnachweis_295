import mysql from "mysql2/promise";
import { useDbConfig } from "./env.ts";

export const db = await mysql.createConnection(useDbConfig());
