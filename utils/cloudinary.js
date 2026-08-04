const cloudinary = require('cloudinary').v2;
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = require('./config');

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error('Cloudinary configuration is missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadDataUri = async (dataUri) => {
  const options = {
    folder: 'app_uploads',
    resource_type: 'image',
  };

  const result = await cloudinary.uploader.upload(dataUri, options);
  return result;
};

const uploadBuffer = async (buffer, mimetype) => {
  const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;
  return uploadDataUri(dataUri);
};

const uploadBase64 = async (base64Image) => {
  return uploadDataUri(base64Image);
};

module.exports = {
  uploadBuffer,
  uploadBase64,
};