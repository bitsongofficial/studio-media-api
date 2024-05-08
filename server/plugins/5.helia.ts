import { UnixFS, unixfs } from "@helia/unixfs";
import { LevelBlockstore } from "blockstore-level";
import { LevelDatastore } from "datastore-level";
import { FsBlockstore } from 'blockstore-fs'
import { FsDatastore } from 'datastore-fs'
import { HeliaLibp2p, createHelia } from "helia";
import { bootstrap } from '@libp2p/bootstrap'
import { circuitRelayTransport, circuitRelayServer } from '@libp2p/circuit-relay-v2'
import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { identify as identifyService } from '@libp2p/identify'
import { autoNAT as autoNATService } from '@libp2p/autonat'
import { uPnPNAT as uPnPNATService } from '@libp2p/upnp-nat'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { dcutr as dcutrService } from '@libp2p/dcutr'
import { kadDHT } from '@libp2p/kad-dht'
import { ping as pingService } from '@libp2p/ping'
import { join } from 'path'
import type { Libp2p, ServiceMap } from '@libp2p/interface'
import { createLibp2p } from 'libp2p'

declare module 'h3' {
  interface H3EventContext {
    helia: HeliaLibp2p<Libp2p<ServiceMap>>
    fs: UnixFS
  }
}

// const blockstore = new LevelBlockstore(join(process.cwd(), '.helia/blockstore'))
// const datastore = new LevelDatastore(join(process.cwd(), '.helia/datastore'))
const blockstore = new FsBlockstore(join(process.cwd(), '.helia/blockstore'))
const datastore = new FsDatastore(join(process.cwd(), '.helia/datastore'))

export default defineNitroPlugin(async (nitroApp) => {
  consola.info('[helia] plugin loading...')

  const libp2p = await createLibp2p({
    datastore,
    addresses: {
      listen: [
        // studio-storage is not dialable, we're only retrieving data from IPFS
      ]
    },
    connectionManager: { //
      minConnections: 50, // if we want to disable auto-dial, we need to set this to 0
      // autoDialConcurrency: 5,
      // maxConnections: 100,
      // maxDialQueueLength: 100,
      // maxParallelDials: 10,
    },
    transports: [
      circuitRelayTransport({
        discoverRelays: 3,
      }),
      tcp(),
      webSockets(),
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    peerDiscovery: [
      bootstrap({
        list: [
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
          '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'
        ]
      })
    ],
    services: {
      identify: identifyService(),
      autoNAT: autoNATService(),
      upnp: uPnPNATService(),
      pubsub: gossipsub(),
      dcutr: dcutrService(),
      dht: kadDHT({
        // don't do DHT server work.
        clientMode: true,
      }),
      relay: circuitRelayServer({
        // don't advertise as a circuitRelay server because we have one job, and that is to:  listen for http requests, maybe fetch content, return http responses.
        // advertise: true
      }),
      ping: pingService()
    }
  })

  // let peers = []

  // libp2p.addEventListener("peer:discovery", (evt) => {
  //   const peer = evt.detail;
  //   //consola.log(`Discovered ${peer.id}`);
  //   // dial them when we discover them
  //   libp2p.dial(peer.id).catch((err) => {
  //     //consola.log(`Could not dial ${peer.id}`, err);
  //   });
  // });
  // // Listen for new connections to peers
  // libp2p.addEventListener("peer:connect", (evt) => {
  //   const connection = evt.detail;
  //   if (!peers.includes(connection.toString())) {
  //     peers.push(connection.toString())
  //   }

  //   consola.log(`Connected (${peers.length}) to ${connection.toString()}`);
  // });
  // // Listen for peers disconnecting
  // libp2p.addEventListener("peer:disconnect", (evt) => {
  //   const connection = evt.detail;
  //   consola.log(`Disconnected (${peers.length}) from ${connection.toString()}`);
  //   if (peers.includes(connection.toString())) {
  //     peers = peers.filter((peer) => peer !== connection.toString())
  //   }
  // });

  const helia = await createHelia({ blockstore, datastore, libp2p, start: false })
  const fs = unixfs(helia)

  nitroApp.hooks.hook('request', async (event) => {
    consola.info('[helia] plugin request...')

    //event.node.req.setMaxListeners(100)
    event.context.helia = helia
    event.context.fs = fs
  })

  nitroApp.hooks.hook('close', async () => {
    consola.info('[helia] plugin close...')
    await blockstore.close()
    await datastore.close()
    await helia.stop()
    consola.info('[helia] plugin closed')
  })

  consola.log('[helia] plugin loaded')
})