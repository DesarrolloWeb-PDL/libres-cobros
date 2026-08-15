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
  console.log('Postgres running on port 5432');

  process.on('SIGINT', async () => {
    await pg.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
