const dotenv = require('dotenv');

// this will allow us to use the variables
// in .env file here in this server.js
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const HOST = process.env.HOST;
const PORT = process.env.PORT;

module.exports = {
    MONGODB_URI,
    HOST,
    PORT
}