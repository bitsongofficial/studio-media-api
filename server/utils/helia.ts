import { UnixFS, unixfs } from "@helia/unixfs";
import { LevelBlockstore } from "blockstore-level";
import { LevelDatastore } from "datastore-level";
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
import type { VerifiedFetchInit } from '@helia/verified-fetch'
import { AbortError } from '@libp2p/interface'
import type { Libp2p } from '@libp2p/interface'

let helia: HeliaLibp2p<Libp2p> | undefined
let fs: UnixFS | undefined

async function getHelia() {
  if (helia !== undefined) {
    console.log('helia already exists, returning...')
    return helia
  }

  console.log('creating helia...')

  const blockstore = new LevelBlockstore(join(process.cwd(), '.helia/blockstore'))
  const datastore = new LevelDatastore(join(process.cwd(), '.helia/datastore'))

  helia = await createHelia({
    blockstore,
    datastore,
    libp2p: {
      datastore,
      addresses: {
        listen: [
          // studio-storage is not dialable, we're only retrieving data from IPFS
        ]
      },
      connectionManager: {
        // disable auto-dial because we don't want to be doing a lot of work to keep connections alive.
        minConnections: 3
      },
      transports: [
        circuitRelayTransport({
          discoverRelays: 1
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
    }
  })

  //await helia.start()
}

export async function getUnixFS() {
  if (fs !== undefined) {
    console.log('fs already exists, returning...')
    return fs
  }

  console.log('creating fs...')

  await getHelia()
  return unixfs(helia)
}


// taken from https://github.com/ipfs/helia-verified-fetch/blob/main/packages/verified-fetch/src/utils/get-stream-from-async-iterable.ts
export async function getStreamFromAsyncIterable(
  iterator: AsyncIterable<Uint8Array>,
  options?: Pick<VerifiedFetchInit, 'onProgress' | 'signal'>
): Promise<{ stream: ReadableStream<Uint8Array>, firstChunk: Uint8Array }> {
  const reader = iterator[Symbol.asyncIterator]()
  const { value: firstChunk, done } = await reader.next()

  if (done === true) {
    throw new Error('No content found')
  }

  const stream = new ReadableStream({
    async start(controller) {
      // the initial value is already available
      //options?.onProgress?.(new CustomProgressEvent<void>('verified-fetch:request:progress:chunk'))
      controller.enqueue(firstChunk)
    },
    async pull(controller) {
      const { value, done } = await reader.next()
      if (options?.signal?.aborted === true) {
        controller.error(new AbortError(options.signal.reason ?? 'signal aborted by user'))
        controller.close()
        return
      }

      if (done === true) {
        if (value != null) {
          //options?.onProgress?.(new CustomProgressEvent<void>('verified-fetch:request:progress:chunk'))
          controller.enqueue(value)
        }
        controller.close()
        return
      }

      //options?.onProgress?.(new CustomProgressEvent<void>('verified-fetch:request:progress:chunk'))
      controller.enqueue(value)
    }
  })

  return {
    stream,
    firstChunk
  }
}