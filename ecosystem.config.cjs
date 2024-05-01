const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  apps: [
    {
      name: "studio-media-api",
      port: "3000",
      exec_mode: "cluster",
      instances: "max",
      script: "./.output/server/index.mjs",
      env: {
        NODE_ENV: "production",
        ...process.env,
      },
    },
  ],
};
