// bin/run-docker.js
const { exec } = require("child_process");
const util = require("util");

const execAsync = util.promisify(exec);

// Runs a shell command and prints output
async function run(cmd) {
  try {
    await execAsync(cmd, { stdio: "inherit" });
  } catch (err) {
    // Do not stop the script if a command fails
    console.warn(`Command failed (ignored): ${cmd}`);
  }
}

// Returns container ID if it exists
async function getContainerId(name) {
  try {
    const { stdout } = await execAsync(`docker ps -a --format "{{.ID}} {{.Names}}"`);

    const lines = stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const find = lines.find((line) => {
      const parts = line.split(" ");
      const containerName = parts.slice(1).join(" ");
      // Match if name is contained in the container name (case-insensitive)
      const exists = containerName.toLowerCase().includes(name.toLowerCase());
      if (exists) {
        return parts[0];
      }
      return undefined;
    });

    if (!find) return "";

    return find.split(" ")[0];
  } catch {
    return "";
  }
}

async function main() {
  // Read container name from APP environment variable
  const appName = process.env.DOCKER_APP || "pdm-frontend";

  if (!appName) {
    console.error(
      `Error: DOCKER_APP variable not defined. Example: DOCKER_APP=${appName} node local-docker-trafeik.js`
    );
    process.exit(1);
  }

  // Stop the APP container if it exists
  const appContainer = await getContainerId(appName);
  if (appContainer) {
    await run(`docker stop ${appContainer}`);
  } else {
    console.log(`Container ${appName} not found, skipping stop.`);
  }

  // Remove traefik container if it exists
  const tfk = await getContainerId("traefik");
  if (tfk) {
    await run(`docker compose down ${tfk}`);
    await run(`docker rm -f ${tfk}`);
  }

  // docker compose down
  await run(
    `docker compose \
      --env-file ../.env \
      --env-file ../.env.docker \
      --env-file ../.env.secret \
      --env-file ../.env.sso \
      -f traefik.compose.yaml \
      down -v`
  );

  // docker compose up
  await run(
    `docker compose \
      -f traefik.compose.yaml \
      --env-file ../.env \
      --env-file ../.env.docker \
      --env-file ../.env.secret \
      --env-file ../.env.sso \
      up -d`
  );

  console.log("Process completed");
}

main();
