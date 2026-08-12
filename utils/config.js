const dotenv = require('dotenv');

// this will allow us to use the variables
// in .env file here in this server.js
dotenv.config();

const normalizeEnv = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/;$/, '');
};

const normalizeEmailPassword = (value) => {
  return normalizeEnv(value).replace(/\s+/g, '');
};

const MONGODB_URI = normalizeEnv(process.env.MONGODB_URI);
const HOST = normalizeEnv(process.env.HOST);
const PORT = normalizeEnv(process.env.PORT);
const CLOUDINARY_CLOUD_NAME = normalizeEnv(process.env.CLOUDINARY_CLOUD_NAME);
const CLOUDINARY_API_KEY = normalizeEnv(process.env.CLOUDINARY_API_KEY);
const CLOUDINARY_API_SECRET = normalizeEnv(process.env.CLOUDINARY_API_SECRET);
const RAZORPAY_KEY_ID = normalizeEnv(process.env.RAZORPAY_KEY_ID);
const RAZORPAY_KEY_SECRET = normalizeEnv(process.env.RAZORPAY_KEY_SECRET);
const EMAIL_USER = normalizeEnv(process.env.EMAIL_USER);
const EMAIL_PASS = normalizeEmailPassword(process.env.EMAIL_PASS);

module.exports = {
    MONGODB_URI,
    HOST,
    PORT,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    EMAIL_USER,
    EMAIL_PASS,
};
