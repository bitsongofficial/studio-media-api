const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  apps: [
    {
      name: "studio-media-api",
      port: process.env.PORT || 3000,
      // Do not use cluster mode, it will not work with the current setup
      // exec_mode: "cluster",
      // Use only one instance
      instances: "1",
      script: "./.output/server/index.mjs",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        ...process.env,
      },
    },
  ],
};
