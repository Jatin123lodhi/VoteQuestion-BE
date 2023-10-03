const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
    question: String,
    votes: {
        type: Number,
        default: 0,
    },
    votedBy: [String]
})

const Question = mongoose.model("Question",questionSchema)
module.exports = Question