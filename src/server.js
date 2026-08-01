import { loadConfigFromEnv } from './config.js';
import { loadEnvFile } from './envFile.js';

async function main() {
  loadEnvFile();

  let config;
  try {
    config = loadConfigFromEnv(process.env);
  } catch (error) {
    console.error(`Subjector configuration error: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const { createSlackApp } = await import('./slack/app.js');
  const { app } = createSlackApp({ config, logger: console });

  await app.start(config.port);
  console.log(`Subjector is running on port ${config.port} (commit ${config.deployment?.commit ?? 'unknown'})`);
}

main().catch((error) => {
  console.error('Subjector failed to start:', error);
  process.exitCode = 1;
});
