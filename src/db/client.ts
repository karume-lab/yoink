import { drizzle } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";
import * as schema from "@/db/schema";

const expoDb = SQLite.openDatabaseSync("yoink.db");
export const db = drizzle(expoDb, { schema });
