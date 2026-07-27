const app= require("./app");

const mongoose = require('mongoose');
const { MONGODB_URI, PORT, HOST } = require("./utils/config");

const dotenv = require("dotenv");

// this will allow us to use the variable of .env file in this server json
dotenv.config();
// connect to the mongodb database
mongoose    
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB database');

        // start the server to listen for requests
        app
            .listen(PORT, HOST, () => {
                console.log(`Server is running at http://${HOST}:${PORT}...`);
            });
    })
    .catch((error) => {
        console.log('Error in connecting to the database');
        console.log(`Error:`, error.message);
    })


// app.listen(5001, "localhost", () => {
//     console.log("server is running");
// })



