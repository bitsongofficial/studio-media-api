module.exports = {
  apps: [
    {
      name: "studio-media-api",
      port: "3000",
      exec_mode: "cluster",
      instances: "max",
      script: "./.output/server/index.mjs",
    },
  ],
};
