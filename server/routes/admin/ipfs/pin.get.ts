import { z } from 'zod'
import { CID } from 'multiformats/cid'
import pinataSDK from '@pinata/sdk'

const schema = z.object({
  cid: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const { cid } = await getValidatedQuery(event, schema.parse)

  const { helia, fs } = event.context

  const pinata = new pinataSDK(useRuntimeConfig().pinata.apiKey, useRuntimeConfig().pinata.apiSecret);

  const list = await pinata.pinList({
    pageLimit: 1000,
  })

  return list.rows.length

  for (const pin of list.rows) {
    consola.info(`pinning: ${pin.ipfs_pin_hash}`)

    const response = await $fetch(`http://142.132.157.177:9097/pins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJJdGhhMnJhaDB3YWV5b2gifQ.tKl2Mp4WDzdCu64xx8TzyNlmZcsneKxQxhNWzmEIaaI`
      },
      body: {
        cid: pin.ipfs_pin_hash
      }
    })

    //consola.box(response)

    //await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return {
    status: 'ok'
  }

  if (await helia.blockstore.has(CID.parse(cid))) {
    console.log(`cid ${cid} already pinned`)
  }
  // else {
  //   await drain(helia.pins.add(CID.parse(cid)))
  //   console.log(`cid ${cid} pinned`)
  // }

  const pinResult = await $fetch(`http://142.132.157.177:9097/pins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJJdGhhMnJhaDB3YWV5b2gifQ.tKl2Mp4WDzdCu64xx8TzyNlmZcsneKxQxhNWzmEIaaI`
    },
    body: {
      cid
    }
  })

  return pinResult

  //const cid = await fs.addBytes(new TextEncoder().encode('hello world by angelo!!!'))

  // const pinServiceConfig = new Configuration({
  //   endpointUrl: `http://142.132.157.177:9097`,
  //   accessToken: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJJdGhhMnJhaDB3YWV5b2gifQ.tKl2Mp4WDzdCu64xx8TzyNlmZcsneKxQxhNWzmEIaaI`
  // })

  // const remotePinningClient = new RemotePinningServiceClient(pinServiceConfig)
  // const remotePinner = createRemotePinner(helia, remotePinningClient)
  // console.log(`remotePinner connected`)

  // const result = await remotePinner.addPin({
  //   cid: CID.parse(cid)
  // })

  // return {
  //   result
  // }
})