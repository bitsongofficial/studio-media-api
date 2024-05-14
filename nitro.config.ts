export default defineNitroConfig({
  imports: {
    autoImport: true
  },
  srcDir: "server",
  storage: {
    mnft: {
      driver: 'fs',
      base: './storage/mnft',
    }
  },
  runtimeConfig: {
    ipfs: {
      api: "http://127.0.0.1:5001/api/v0",
      gateway: "",
      clusterApi: "",
      clusterApiJwt: "",
      pinningServer: "",
      pinningJwt: "",
    },
    pinata: {
      enable: false,
      apiKey: "",
      apiSecret: "",
    },
    s3: {
      accessKeyId: "",
      secretAccessKey: "",
      bucket: "",
      region: ""
    },
  },
});
