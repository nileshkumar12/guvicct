const express = require("express");

const { getAllTodos,createTodo, getTodoById, updateTodo, deleteTodo } = require("../controllers/todoController");

const todoRouter = express.Router();

//  define the routes
todoRouter.get("/", getAllTodos);
todoRouter.get("/:id", getTodoById);
todoRouter.post("/", createTodo);
todoRouter.put("/:id", updateTodo)
todoRouter.delete("/:id",deleteTodo)

module.exports = todoRouter;

