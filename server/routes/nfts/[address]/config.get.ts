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
        creator: string
        symbol: string
        name: string
        uri: string
        payment_denom: string
        max_per_address?: number
        next_token_id: string
        seller_fee_bps: number
        referral_fee_bps: number
        protocol_fee_bps: number
        start_time: string
        max_edition?: number
        bs721_address: string
        payment_address: string
        ratio: number
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
      totalSupply: supply.data.count,
      creator: config.data.creator,
      symbol: config.data.symbol,
      name: config.data.name,
      uri: config.data.uri,
      paymentDenom: config.data.payment_denom,
      maxPerAddress: config.data.max_per_address,
      nextTokenId: config.data.next_token_id,
      sellerFeeBps: config.data.seller_fee_bps,
      referralFeeBps: config.data.referral_fee_bps,
      protocolFeeBps: config.data.protocol_fee_bps,
      startTime: config.data.start_time,
      maxEdition: config.data.max_edition,
      bs721Address: config.data.bs721_address,
      paymentAddress: config.data.payment_address,
      ratio: config.data.ratio,
    }
  } catch (e) {
    console.error(e)
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
}, {
  maxAge: 1 * 60, // 1 minute
})