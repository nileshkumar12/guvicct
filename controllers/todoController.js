const express = require('express');

const Todo = require("../model/todo")

const todoController = {
    getAllTodos: async (request, response) => {
        try {
            const todos = await Todo.find({}, {});
            response.status(200).json(todos);
        } catch (e) {
            return response.status(500).json({ message: 'Error fetching all todos...', error: e.message });
        }
    },
    getTodoById: async (request, response) => {
        try {
            const { id } = request.params;

            const todo = await Todo.findById(id);

            response.status(200).json(todo);
        } catch (e) {
            return response.status(500).json({ message: 'Error fetching all todos...', error: e.message });
        }
    },

      createTodo: async (request, response) => {
        try {
            // get the data from the frontend
            const { title, description, isDone } = request.body;

            // create a object to the model
            const newTodo = new Todo({
                title,
                description,
                isDone
            });

            // save the data to the database
            const savedTodo = await newTodo.save();

            // send a response to the frontend
            response.status(200).json({ message: 'New todo created successfully', data: savedTodo });
        } catch (e) {
            return response.status(500).json({ message: 'Error creaing new todo...', error: e.message });
        }
    },

    updateTodo: async (request, response) => {
        try {
            const { id } = request.params;

            const { title, description, isDone } = request.body;

            const updatedTodo = await Todo.findByIdAndUpdate(id, { title, description, isDone }, { returnDocument: "after", runValidators: true });

            response.status(200).json({ message: 'Todo updated', data: updatedTodo });
        } catch (e) {
            return response.status(500).json({ message: 'Error updating todo...', error: e.message });
        }
    },
    deleteTodo: async (request, response) => {
        try {
            // get the id from the request params
            const { id } = request.params;

            // perform deletion
            const deletedTodo = await Todo.findByIdAndDelete(id);

            if (!deletedTodo) {
                // this means, deletedTodo is null
                // the id either does not exist or the object does not exist
                // send an error response in these cases
                return response.status(500).json({ message: 'Todo not found...' });
            }

            response.status(200).json({ message: 'Deleted todo successfully' });
        } catch (e) {
            return response.status(500).json({ message: 'Error deleting todo...', error: e.message });
        }
    }


}

module.exports = todoController;