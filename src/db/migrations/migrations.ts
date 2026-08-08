// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from "@/db/migrations/0000_amusing_sunfire.sql";
import m0001 from "@/db/migrations/0001_perfect_sebastian_shaw.sql";
import journal from "@/db/migrations/meta/_journal.json";

export default {
  journal,
  migrations: {
    m0000,
    m0001,
  },
};
