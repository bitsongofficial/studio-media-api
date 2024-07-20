import { getMarketplaceByNft } from "~/utils/bitsong";

export default defineCachedEventHandler(async (event) => {
  const address: string = getRouterParam(event, 'address')
  if (!address) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  try {
    const marketplaceAddress = await getMarketplaceByNft(address)

    const endpoint = 'https://lcd.explorebitsong.com'

    const configUrl = `${endpoint}/cosmwasm/wasm/v1/contract/${marketplaceAddress}/smart/${btoa(`{"get_config":{}}`)}`;
    const supplyUrl = `${endpoint}/cosmwasm/wasm/v1/contract/${address}/smart/${btoa(`{"num_tokens":{}}`)}`;

    interface QueryConfigResponse {
      data: {
        ratio: number
        seller_fee_bps: number
        referral_fee_bps: number
        protocol_fee_bps: number
        max_edition?: number
        max_per_address?: number
      }
    }

    interface QuerySupplyResponse {
      data: {
        count: number
      }
    }

    const [config, supply] = await Promise.all([
      $fetch<QueryConfigResponse>(configUrl),
      $fetch<QuerySupplyResponse>(supplyUrl),
    ]);

    return {
      marketplaceAddress: marketplaceAddress,
      nftAddress: address,
      ratio: config.data.ratio,
      sellerFeeBps: config.data.seller_fee_bps,
      referralFeeBps: config.data.referral_fee_bps,
      protocolFeeBps: config.data.protocol_fee_bps,
      totalSupply: supply.data.count,
    }
  } catch (e) {
    console.error(e)
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
}, {
  maxAge: 1 * 60, // 1 minute
})