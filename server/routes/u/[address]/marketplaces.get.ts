import { getMarketplacesByCreator } from "~/utils/bitsong"

export default defineCachedEventHandler(async (event) => {
  const address: string = getRouterParam(event, 'address')
  if (!address) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  return await getMarketplacesByCreator(address)
}, {
  maxAge: 60 * 60 * 4, // 4 hours
  getKey: (event) => `marketplaces:${getRouterParam(event, 'address')}`
})