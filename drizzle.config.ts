import 'dotenv/config';

const config = {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql' as const,
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      `postgres://${process.env.PGUSER || process.env.SQL_USER || 'ibn_baydoah'}:${process.env.PGPASSWORD || process.env.SQL_PASSWORD || 'postgres'}@${process.env.PGHOST || process.env.SQL_HOST || '127.0.0.1'}:${process.env.PGPORT || process.env.SQL_PORT || '5432'}/${process.env.PGDATABASE || process.env.SQL_DATABASE || 'ibn_baydoah'}`,
  },
};

export default config;
