const cloudinary = require('cloudinary').v2
const { Readable } = require('stream')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadBuffer = (buffer, folder) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: `foodops/${folder}`, resource_type: 'image' },
    (err, result) => err ? reject(err) : resolve(result.secure_url)
  )
  Readable.from(buffer).pipe(stream)
})

const deleteByUrl = async (url) => {
  if (!url || !url.includes('cloudinary.com')) return
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i)
  if (match) await cloudinary.uploader.destroy(match[1])
}

module.exports = { uploadBuffer, deleteByUrl }
