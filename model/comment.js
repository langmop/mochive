const mongoose = require("mongoose");
const User = require("./user");
const CommentSchema = new mongoose.Schema({
  movie: {
    type: Number,
    required: true,
  },
  comment: {
    required: true,
    type: String,
  },
  email: {
    required: true,
    type: String,
  },
});

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;
