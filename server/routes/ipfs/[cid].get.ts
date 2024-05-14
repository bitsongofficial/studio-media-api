import { z } from 'zod'

const schema = z.object({
  cid: z.string().min(1)
})

export default eventHandler(async (event) => {
  const { cid } = await getValidatedRouterParams(event, schema.parse)

  console.log(`IPFS CID: ${cid}`)

  const record = await cachedStorageData(cid)
  if (!record) {
    throw createError({ status: 404, message: 'Not found' })
  }

  return proxyRequest(event, useIpfsLink(cid))
})