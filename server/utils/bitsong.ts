import { gql, request } from "graphql-request"
import { TrackSchema } from '@bitsongjs/metadata'
import BigNumber from "bignumber.js";

const BS721_BASE_GQL_ENDPOINT = "https://indexer-bs721-base.bitsong.io/"
const BS721_CURVE_GQL_ENDPOINT = "https://indexer-bs721-curve.bitsong.io/"

// export async function fetchGraphQL(endpoint: string, query: string) {
//   return await $fetch(endpoint, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: { query },
//   })
// }

const GetBs721StreamInfo = gql`
  query GetBs721StreamInfo($ids: [String!]) {
    nfts(
      filter: {
        id: {
          in: $ids
        }
      }
    ) {
      nodes {
        id
        metadata {
          schema
          name
          image
          animationUrl
          bitsong
        }
      }
    }
  }
`

// export async function getBs721TrackInfo(id: string) {
//   const response = await request(BS721_BASE_GQL_ENDPOINT, GetBs721StreamInfo, { id })

//   const data = {
//     // @ts-expect-error - improve typing
//     ...response.nft.metadata,
//     // @ts-expect-error - improve typing
//     '$schema': response.nft.metadata.schema,
//   }

//   return TrackSchema.parse(data)
// }

interface GetBs721TrackInfoResponse {
  nfts: {
    nodes: {
      id: string
      metadata: {
        schema?: string
        name?: string
        image?: string
        animationUrl?: string
        bitsong?: any
      }
    }[]
  }
}

export async function getBs721TrackInfo(ids: string[]) {
  const response = await request<GetBs721TrackInfoResponse>(BS721_BASE_GQL_ENDPOINT, GetBs721StreamInfo, { ids })

  return response.nfts.nodes.map((nft) => {
    const data = {
      ...nft.metadata,
      '$schema': nft.metadata.schema,
    }

    // Force the resolution of some metadata
    // - Fix bitsong18a0pvw326fydfdat5tzyf4t8lhz0v6fyfaujpeg07fwqkygcxejsv0vqlr metadata
    if (nft.id === 'bitsong18a0pvw326fydfdat5tzyf4t8lhz0v6fyfaujpeg07fwqkygcxejsv0vqlr') {
      nft.metadata.bitsong.video = nft.metadata.animationUrl
    }

    return {
      id: nft.id,
      ...TrackSchema.parse(data),
    }
  })
}

const GetNftsByOwner = gql`
  query MyNfts($address: String!) {
    nftTokens(
      filter: {
        owner: {
          equalTo: $address
        },
        nftTokenBurnsExist: false
      },
      distinct: NFT_ID,
      last: 10000
    ) {
      totalCount
      groupedAggregates(groupBy: NFT_ID) {
        keys
        distinctCount {
          tokenId
        }
      }
      nodes {
        nftId
        tokenId
        nft {
          name
          tokens(
            filter: {
              owner: {
                equalTo: $address
              }
              nftTokenBurnsExist: false
            }
          ) {
            nodes {
              tokenId
            }
          }
          metadata {
            name
            image
          }
        }
      }
    }
  }
`

interface GetNftsByOwnerRequest {
  nftTokens: {
    totalCount: number
    groupedAggregates: {
      keys: string[]
      distinctCount: {
        tokenId: string
      }
    }[]
    nodes: {
      nftId: string
      tokenId: string
      nft: {
        name: string
        tokens: {
          nodes: {
            tokenId: string
          }[]
        }
        metadata: {
          name: string
          image: string
        }
      }
    }[]
  }
}

interface GetNftsByOwnerResponse {
  totalCount: number
  nfts: {
    nft: string
    name: string
    image: string
    totalIds: number
    tokenIds?: string[]
  }[]
}

export async function getNftsByOwner(address: string): Promise<GetNftsByOwnerResponse> {
  const response = await request<GetNftsByOwnerRequest>(BS721_BASE_GQL_ENDPOINT, GetNftsByOwner, { address })

  return {
    totalCount: response.nftTokens.totalCount,
    nfts: response.nftTokens.nodes.map((nft) => {
      return {
        nft: nft.nftId,
        name: nft.nft.name,
        image: nft.nft.metadata.image,
        totalIds: parseInt(response.nftTokens.groupedAggregates.find((agg) => agg.keys[0] === nft.nftId)?.distinctCount.tokenId || '0'),
        tokenIds: nft.nft.tokens.nodes.map((token) => token.tokenId),
      }
    })
  }
}

export const GetMarketplacesByNft = gql`
  query GetMarketplacesByNft($address: String!) {
    marketplaces(
      filter: {
        nftAddress: {
          equalTo: $address
        }
      }
    ) {
      totalCount
      nodes {
        id
      }
    }
  }
`

export interface GetMarketplacesByNftRequest {
  marketplaces: {
    totalCount: number
    nodes: {
      id: string
    }[]
  }
}

export async function getMarketplaceByNft(address: string): Promise<string> {
  const response = await request<GetMarketplacesByNftRequest>(BS721_CURVE_GQL_ENDPOINT, GetMarketplacesByNft, { address })
  if (response.marketplaces.totalCount === 0) {
    throw new Error('No marketplace found for this address')
  }

  return response.marketplaces.nodes[0].id
}

interface CurveOptions {
  ratio: number
  sellerFeeBps: number
  referralFeeBps: number
  protocolFeeBps: number
  totalSupply: number
}

function fromBasisPoints(bps: number): number {
  return new BigNumber(bps).dividedBy(new BigNumber(10_000)).toNumber();
}

function fromMicroAmount(amount: number): number {
  return new BigNumber(amount)
    .integerValue(BigNumber.ROUND_DOWN)
    .dividedBy(new BigNumber(1_000_000))
    .decimalPlaces(6)
    .toNumber();
}

export function useCurveSimulator(amount: number, opts: CurveOptions) {
  function sumOfSquares(n: number): number {
    if (n === 0) {
      return 0;
    }

    return n * (n + 1) * (2 * n + 1) / 6;
  }

  function computeBasePrice(ratio: number, supply: number, amount: number): number {
    const sum1 = sumOfSquares(supply);
    const sum2 = sumOfSquares(supply + amount);

    return (sum2 - sum1) * 1_000_000 / ratio;
  }

  const defaultResponse = {
    basePrice: 0,
    creatorFee: 0,
    referralFee: 0,
    protocolFee: 0,
    totalPrice: 0,
    avgPrice: 0,
  }

  function buyPrice() {
    const basePrice = computeBasePrice(opts.ratio, opts.totalSupply, amount);
    if (!basePrice || Number.isNaN(basePrice) || basePrice === Infinity) {
      return defaultResponse;
    }

    const creatorFee = fromBasisPoints(opts.sellerFeeBps) * basePrice;
    if (!creatorFee || Number.isNaN(creatorFee) || creatorFee === Infinity) {
      return defaultResponse;
    }

    const referralFee = 0
    const protocolFee = fromBasisPoints(opts.protocolFeeBps) * basePrice;

    const totalPrice = basePrice + creatorFee + referralFee + protocolFee;

    return {
      basePrice: fromMicroAmount(basePrice),
      creatorFee: fromMicroAmount(creatorFee),
      referralFee: fromMicroAmount(referralFee),
      protocolFee: fromMicroAmount(protocolFee),
      totalPrice: fromMicroAmount(totalPrice),
      avgPrice: fromMicroAmount(totalPrice / amount),
    };
  }

  function sellPrice() {
    const basePrice = computeBasePrice(opts.ratio, opts.totalSupply - amount, amount);
    if (!basePrice || Number.isNaN(basePrice) || basePrice === Infinity) {
      return defaultResponse;
    }

    const creatorFee = fromBasisPoints(opts.sellerFeeBps) * basePrice;
    if (!creatorFee || Number.isNaN(creatorFee) || creatorFee === Infinity) {
      return defaultResponse;
    }

    const referralFee = 0
    const protocolFee = fromBasisPoints(opts.protocolFeeBps) * basePrice;

    const totalPrice = basePrice - creatorFee - referralFee - protocolFee;

    return {
      basePrice: fromMicroAmount(basePrice),
      creatorFee: fromMicroAmount(creatorFee),
      referralFee: fromMicroAmount(referralFee),
      protocolFee: fromMicroAmount(protocolFee),
      totalPrice: fromMicroAmount(totalPrice),
      avgPrice: fromMicroAmount(totalPrice / amount),
    };
  }

  return {
    amount,
    buyPrice: buyPrice(),
    sellPrice: sellPrice(),
  }
}