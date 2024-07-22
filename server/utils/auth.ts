import { H3Event } from 'h3'

export async function ensureAuth(event: H3Event) {
  const authRequest = auth.handleRequest(event);
  //const session = await auth.getSession(getCookie(event, 'auth_session'))
  const session = await authRequest.validateBearerToken()
  const user = session?.user ?? null

  const adminAddresses = [
    'bitsong1h882ezq7dyewld6gfv2e06qymvjxnu842586h2', //dev
    'bitsong1q49ntyz2wjurrm56ymm5hjnz60ya3x783c5m6e',
    'bitsong1s5kwp97f2fsysy2rfwv4w5kl06rnta8fj06e2y', //dev2
    'bitsong144n93v67ld0x49v6nceqyw44gzmc6du0r30dve'
  ]

  if (user === null) {
    throw createError({
      message: 'You must be logged in',
      status: 401
    })
  }

  return {
    ...user,
    isAdmin: adminAddresses.includes(user.address),
    canUpload: user.beta_features !== undefined && user.beta_features?.includes('upload'),
    canPrivateUploads: user.beta_features !== undefined && user.beta_features?.includes('private-uploads')
  }
}