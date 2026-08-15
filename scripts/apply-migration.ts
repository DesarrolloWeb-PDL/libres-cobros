import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: './tmp/postgres-data',
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
  });

  await pg.initialise();
  await pg.start();

  const env = {
    ...process.env,
    DATABASE_URL:
      'postgresql://postgres:password@127.0.0.1:5432/postgres?sslmode=disable',
  };

  await new Promise<void>((resolve, reject) => {
    const child = spawn('npx prisma migrate dev --name init', {
      shell: true,
      stdio: ['pipe', 'inherit', 'inherit'],
      env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Migration exited with code ${code}`));
    });

    // Answer "yes" to any interactive prompts from `migrate dev`.
    if (child.stdin) {
      child.stdin.write('y\n');
      child.stdin.end();
    }
  });

  await pg.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
