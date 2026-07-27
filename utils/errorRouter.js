const express = require('express');

const errorRouter = express.Router();

errorRouter.use((request, response) => {
    response.status(404).json({
        success: false,
        message: `Route not found: ${request.method} ${request.originalUrl}}`
    })
});

module.exports = errorRouter;