import { gql, request } from "graphql-request"
import { TrackSchema } from '@bitsongjs/metadata'

const BS721_BASE_GQL_ENDPOINT = "https://indexer-bs721-base.bitsong.io/"

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

    return {
      id: nft.id,
      ...TrackSchema.parse(data),
    }
  })
}