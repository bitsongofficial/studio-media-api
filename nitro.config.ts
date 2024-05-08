// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);

export default defineNitroConfig({
  hooks: {
    "dev:reload": async () => {
      console.log("Reloading...")
      await require('./node_modules/.pnpm/node-datachannel@0.8.0/node_modules/node-datachannel/build/Release/node_datachannel.node')
    }
  },
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
