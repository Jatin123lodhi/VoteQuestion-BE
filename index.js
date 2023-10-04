const express = require("express");
const http = require('http');
const {Server} = require('socket.io')
const connectToDatabase = require("./db");
const Admin = require("./models/Admin");
const Question = require("./models/Question");
const User = require("./models/User");
const jwt = require("jsonwebtoken");
const { SECRET } = require("./middleware/auth");
const { authenticateJwt } = require("./middleware/auth");
const cors = require("cors");
const { error } = require("console");

const app = express();

app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server,{
  cors:{
      origin: [
        "https://peppy-sherbet-a0460b.netlify.app", // admin frontend
        "http://localhost:5174",  // client frontend
      ],
      methods: ["GET","POST","PUT","DELETE"]
  }
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Listen for upvote events
  socket.on('upvote', (questionId,username) => {
    console.log('check request from client and add logic for upvote',questionId,username)
    handleUpvote(questionId,username)
  });

  socket.on('deleteQuestion', (questionId) => {
    console.log('deletee Question ',questionId)
    handleDelete(questionId)
  });

  socket.on('addingQuestion',()=>{
    console.log('addingQuestion received')
    io.emit('questionAdded')
  })


  socket.on('editingQuestion',()=>{
    io.emit('questionEdited')
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

});


//make database connection
connectToDatabase();

app.get("/", (req, res) => {
  res.send("Hi this is home page");
});

app.get("/me", authenticateJwt, async (req, res) => {
  const admin = await Admin.findOne({ username: req.user.username });
  if (!admin) {
    res.status(403).json({msg: "Admin doesnt exist"})
    return
  }
  res.json({
      username: admin.username
  })
});

// admin routes
app.post("/admin/login", async (req, res) => {
  console.log(req.body);
  const { username, password } = req.body;
  if (username && password) {
    try {
      const response = await Admin.findOne({ username });
      console.log(response);
      if (response) {
        const token = jwt.sign({ username, role: "admin" }, SECRET, {
          expiresIn: "1h",
        });
        res.json({ message: "Logged in successfully", token });
      // } else res.status(401).json({ msg: "invalid username or password", response });
    } else res.sendStatus(403)
    } catch (err) {
      res.json({ msg: err.message });
    }
  } else res.json({ msg: "username or password not defined" });
});

app.post("/admin/signup", async (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);
  if (username && password) {
    try {
      // check if username already exists
      const isPresent = await Admin.findOne({
        username,
      });
      if (isPresent) {
        return res.status(409).json({ message: 'Username already exists' });
      } else {
        const newAdmin = new Admin({
          username: username,
          password: password,
        });
        const response = await newAdmin.save();
        console.log(response);
        const token = jwt.sign({ username, role: "admin" }, SECRET, {
          expiresIn: "1h",
        });
        res.json({ message: "Admin created successfully", token });
      }
    } catch (err) {
      console.log(err.message);
      res.json({ msg: err.message });
    }
  } else {
    res.json({ msg: "username or password not defined" });
  }
});

// user routes
app.post("/user/login", async (req, res) => {
  console.log(req.body);
  const { username, password } = req.body;
  if (username && password) {
    try {
      const response = await User.findOne({ username });
      console.log(response);
      if (response) {
        const token = jwt.sign({ username, role: "user" }, SECRET, {
          expiresIn: "1h",
        });
        res.json({ message: "Logged in successfully", token });
      } else res.json({ msg: "invalid username or password", response });
    } catch (err) {
      res.json({ msg: err.message });
    }
  } else res.json({ msg: "username or password not defined" });
});

app.post("/user/signup", async (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);
  if (username && password) {
    try {
      // check if username already exists
      const isPresent = await User.findOne({
        username,
      });
      if (isPresent) {
        res.json({ msg: "Username already exists" });
      } else {
        const newAdmin = new User({
          username: username,
          password: password,
        });
        const response = await newAdmin.save();
        console.log(response);
        const token = jwt.sign({ username, role: "user" }, SECRET, {
          expiresIn: "1h",
        });
        res.json({ message: "User created successfully", token });
      }
    } catch (err) {
      console.log(err.message);
      res.json({ msg: err.message });
    }
  } else {
    res.json({ msg: "username or password not defined" });
  }
});

// user upvote/downvote question
async function handleUpvote(questionId,username){
  try {
    const isPresent = await Question.findById(questionId);
    console.log("isPresent", isPresent);
    if (isPresent?._id) {
      const isVoted = isPresent.votedBy.find((v) => v == username);
      if (isVoted) {

        // res.json({ msg: "Already voted" });
      } else {
        await Question.updateOne(
          { _id: questionId },
          {
            votes: isPresent.votes + (true ? 1 : -1),
            votedBy: [...isPresent.votedBy, username], // username of current user
          }
        );
        io.emit('questionVoted')
        // res.json({ response });
      }
    } else {
      // res.json({ msg: "question not found" });
    }
  } catch (err) {
    // res.json({ msg: err.message });
  }
}

app.put("/vote/question/:id",authenticateJwt ,async (req, res) => {
  try {
    const isPresent = await Question.findById(req.params.id);
    console.log("isPresent", isPresent);
    if (isPresent?._id) {
      const isVoted = isPresent.votedBy.find((v) => v == req.body.username);
      if (isVoted) {

        res.json({ msg: "Already voted" });
      } else {
        const response = await Question.updateOne(
          { _id: req.params.id },
          {
            votes: isPresent.votes + (req.body.vote ? 1 : -1),
            votedBy: [...isPresent.votedBy, req.body.username], // username of current user
          }
        );
        io.emit('upvote')
        res.json({ response });
      }
    } else {
      res.json({ msg: "question not found" });
    }
  } catch (err) {
    res.json({ msg: err.message });
  }
});

// create question
app.post("/admin/question",authenticateJwt ,async (req, res) => {
  console.log(req.body);
  if (req.body.question) {
    try {
      const newQuestion = new Question({
        question: req.body.question,
      });
      const response = await newQuestion.save();
      res.json({ response });
    } catch (err) {
      res.json({ msg: err.message });
    }
  } else {
    res.json({ msg: "Please provide question" });
  }
});

// read question
app.get("/questions", async (req, res) => {
  try {
    const response = await Question.find().sort({ votes: -1 });
    res.json({ response });
  } catch (err) {
    console.log(err.message);
    res.json({ msg: err.message });
  }
});

// update question
app.put("/admin/question/:id",authenticateJwt ,async (req, res) => {
  const updatedQuestion = req.body.question;
  if (updatedQuestion) {
    try {
      const isPresent = await Question.findById(req.params.id);
      console.log("isPresent", isPresent);
      if (isPresent?._id) {
        await Question.findByIdAndUpdate(req.params.id, {
          question: updatedQuestion,
        });
        res.json({ msg: "question updated" });
      } else {
        res.json({ msg: "Question not found" });
      }
    } catch (err) {
      res.json({ msg: err.message });
    }
  } else {
    res.json({ msg: "Please provide question" });
  }
});

// delete question
async function handleDelete(questionId){
  console.log('handleDelletedd')
  debugger
  try {
    const response = await Question.deleteOne({ _id: questionId });
    io.emit('questionDeleted')
    // res.json({ response });
  } catch (err) {
    // res.json({ msg: err.message });
    console.log(err)
  }
}
// app.delete("/admin/question/:id",authenticateJwt ,async (req, res) => {
//   try {
//     const response = await Question.deleteOne({ _id: req.params.id });
//     res.json({ response });
//   } catch (err) {
//     res.json({ msg: err.message });
//   }
// });

// app.listen("3000", () => {
//   console.log("server started");
// });
server.listen("3000", () => {
  console.log("server started");
});
