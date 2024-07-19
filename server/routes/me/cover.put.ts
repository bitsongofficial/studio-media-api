import { Readable } from 'stream';

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)

  const data = await readMultipartFormData(event)
  const cover = data.find((item) => item.name === 'cover')
  if (!cover) {
    throw createError({ statusCode: 400, statusMessage: 'No cover file uploaded' })
  }

  try {
    const coverStream = new Readable();
    coverStream.push(cover.data);
    coverStream.push(null);

    const { cid } = await useIpfs().put(`${user.address}_cover`, coverStream, user.address)
    const updatedUser = await auth.updateUserAttributes(user.userId, { avatar: cid })

    return {
      user: updatedUser
    }
  } catch (e) {
    throw createError({ statusCode: 400, statusMessage: `Error uploading file: ${e.message}` })
  }
})