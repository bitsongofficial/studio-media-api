import { Readable } from 'stream';

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)

  const data = await readMultipartFormData(event)
  const avatar = data.find((item) => item.name === 'avatar')
  if (!avatar) {
    throw createError({ statusCode: 400, statusMessage: 'No avatar file uploaded' })
  }

  try {
    const avatarStream = new Readable();
    avatarStream.push(avatar.data);
    avatarStream.push(null);

    const { cid } = await useIpfs().put(`${user.address}_avatar`, avatarStream, user.address)
    const updatedUser = await auth.updateUserAttributes(user.userId, { avatar: cid })

    return {
      user: updatedUser
    }
  } catch (e) {
    throw createError({ statusCode: 400, statusMessage: `Error uploading file: ${e.message}` })
  }
})