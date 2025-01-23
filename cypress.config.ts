import { defineConfig } from "cypress";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      require('@cypress/code-coverage/task')(on, config);

      on("task", {
        log(message) {
          console.log(message);
          return null;
        },
      });

      return config;
    },
    baseUrl: "http://localhost:1234",
  },
  env: {
    DATABASE_HOST: process.env.DATABASE_HOST,
    DATABASE_PATH: process.env.DATABASE_PATH,
    AUTH_PATH: process.env.AUTH_PATH,
  },
  includeShadowDom: true,
});
