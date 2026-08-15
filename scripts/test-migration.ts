import { spawn } from 'node:child_process';
import EmbeddedPostgres from 'embedded-postgres';

async function runCommand(
  command: string,
  env: NodeJS.ProcessEnv,
  input?: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
      env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command "${command}" exited with code ${code}`));
    });

    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

async function main() {
  const dataDir = './tmp/postgres-data';
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();

  const env = {
    ...process.env,
    DATABASE_URL:
      'postgresql://postgres:password@127.0.0.1:5432/postgres?sslmode=disable',
  };

  try {
    await runCommand('npx prisma generate', env);
    await runCommand('npx prisma migrate dev --name init', env, 'y\n');
  } finally {
    try {
      await pg.stop();
    } catch {
      // Ignore cleanup errors on Windows when removing the data directory.
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
