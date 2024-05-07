const MaxRequestSizeInBytes = 300 * 1024 * 1024 // 10MB

export default defineEventHandler(async (event) => {
  if (['POST', 'PUT', 'DELETE'].includes(event.node.req.method!)) {
    const contentLengthValue = getRequestHeader(event, 'content-length')
    const contentLength = parseInt(contentLengthValue as string) || 0

    if (contentLength >= MaxRequestSizeInBytes) {
      const payloadTooLargeError = {
        statusCode: 413,
        statusMessage: 'Payload Too Large'
      }
      throw createError(payloadTooLargeError)
    }
  }
})