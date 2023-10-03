let mongoose = require('mongoose')

const DATABASE_URL  = "mongodb+srv://jatin-mongodb:Jatin123@cluster0.gwlgfyx.mongodb.net/?retryWrites=true&w=majority"

const connectToDatabase = async() => {
  try{
    await mongoose.connect(DATABASE_URL)
    console.log('Database connection successful')
  }
  catch(err){
    console.error('Database connection error',err.message);
  }
}

module.exports =  connectToDatabase 