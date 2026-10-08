const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");

const envFile = process.env.ENV_CONTEXT ? `.env.${process.env.ENV_CONTEXT}` : ".env.local";
const orgName = process.env.ORG_NAME ? `.env.${process.env.ORG_NAME}` : "";

const environment = dotenv.config({
  path: ["../.env.secret", orgName ? `./${orgName}` : "", `../${envFile}`, "../.env"],
});
dotenvExpand.expand(environment);

const sample = fs.readFileSync(path.join(__dirname, "../src/assets/env.sample.js"), "utf8");
const env = path.join(__dirname, "../src/assets/env.js");

const content = sample
  .replace(/\$\{([A-Z0-9_]+)\}/g, (match, varName) => {
    const value = process.env[varName];
    if (envFile.includes("local")) {
      if (varName.includes("KEYCLOAK")) {
        return "";
      }
    }
    return value ? (/\$/.test(value) ? "" : value) : match;
  })
  .replace(/"([+-]?(?:\d+\.?\d*|\.\d+))"/g, "$1")
  .replace(/"true"/g, `true`)
  .replace(/"false"/g, `false`);
fs.writeFileSync(env, content);
