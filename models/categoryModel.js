const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  image: { type: String },
}, {
  timestamps: true,
  collection: 'categories',
});

module.exports = mongoose.model('Category', categorySchema);
