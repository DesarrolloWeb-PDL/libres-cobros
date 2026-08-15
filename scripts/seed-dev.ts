import { execSync } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: './tmp/postgres-data',
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
  });

  await pg.start();

  const env = {
    ...process.env,
    DATABASE_URL:
      'postgresql://postgres:password@127.0.0.1:5432/postgres?sslmode=disable',
  };

  try {
    execSync('npx prisma db seed', {
      stdio: 'inherit',
      env,
    });
  } finally {
    await pg.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
