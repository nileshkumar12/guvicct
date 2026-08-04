const dotenv = require('dotenv');

// this will allow us to use the variables
// in .env file here in this server.js
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const HOST = process.env.HOST;
const PORT = process.env.PORT;
const IMG_URLS = process.env.IMG_URLS ? process.env.IMG_URLS.replace(/\/+$/, '') : '';
const APP_URL = process.env.APP_URL ? process.env.APP_URL.replace(/\/+$/, '') : '';

const buildImageUrl = (req, filename) => {
  if (!filename) return '';
  const baseUrl = IMG_URLS || APP_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${filename}`;
};

module.exports = {
    MONGODB_URI,
    HOST,
    PORT,
    IMG_URLS,
    buildImageUrl,
};