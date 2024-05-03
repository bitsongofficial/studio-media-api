export default defineNitroConfig({
  hooks: {
    //"dev:reload": async () => await import('node-datachannel'),
  },
  srcDir: "server",
  storage: {
    mnft: {
      driver: 'fs',
      base: './storage/mnft',
    }
  },
  // routeRules: {
  //   'tracks/**': {
  //     cors: false,
  //     // headers: {
  //     //   'Access-Control-Allow-Origin': '*',
  //     //   'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  //     //   'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  //     // }
  //   }
  // },
  runtimeConfig: {
    ipfs: {
      gateway: ""
    },
    pinata: {
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
