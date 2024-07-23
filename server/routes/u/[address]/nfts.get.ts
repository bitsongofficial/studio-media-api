import { getNftsByOwner } from "~/utils/bitsong"
import { z } from 'zod'

const schema = z.object({
  includeValue: z.boolean().optional().default(true)
})

export default defineEventHandler(async (event) => {
  const address: string = getRouterParam(event, 'address')
  if (!address) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const { includeValue } = await getValidatedQuery(event, schema.parse)

  const data = await getNftsByOwner(address)

  let nfts = data.nfts.map((nft) => {
    return {
      ...nft,
      value: 0
    }
  })

  if (includeValue) {
    nfts = await Promise.all(data.nfts.map(async (nft) => {
      const config = await $fetch(`/nfts/${nft.nft}/config`)

      const { sellPrice } = useCurveSimulator(nft.totalIds, {
        ratio: config.ratio,
        sellerFeeBps: config.sellerFeeBps,
        referralFeeBps: config.referralFeeBps,
        protocolFeeBps: config.protocolFeeBps,
        totalSupply: config.totalSupply,
      })

      return {
        ...nft,
        value: sellPrice.totalPrice,
      }
    }))
  }

  return {
    totalCount: data.totalCount,
    totalValue: nfts.reduce((acc, nft) => acc + nft.value, 0),
    nfts
  }
})