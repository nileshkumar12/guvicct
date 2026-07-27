// const mongoose = require("mongoose");


const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
    title: String,
    description: String,
    isDone: Boolean
}, { timestamps: true });

module.exports = mongoose.model('todo', todoSchema, 'todos');

// module.exports = mongoose.model("TodoModel", scima, "todos")