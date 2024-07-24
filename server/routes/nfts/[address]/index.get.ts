import { getNft } from "~/utils/bitsong"

export default defineCachedEventHandler(async (event) => {
  const address: string = getRouterParam(event, 'address')
  if (!address) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  return await getNft(address)
}, {
  getKey: (event) => `nft:${getRouterParam(event, 'address')}`,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
})