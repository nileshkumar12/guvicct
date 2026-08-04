const dotenv = require('dotenv');

// this will allow us to use the variables
// in .env file here in this server.js
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const HOST = process.env.HOST;
const PORT = process.env.PORT;
const IMG_URLS = process.env.IMG_URLS ? process.env.IMG_URLS.replace(/\/+$/, '') : '';

module.exports = {
    MONGODB_URI,
    HOST,
    PORT,
    IMG_URLS,
};