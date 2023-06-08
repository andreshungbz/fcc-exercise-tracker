const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

// body-parser module
const bodyParser = require('body-parser');
// momentjs module
const moment = require('moment');
// mongoose module
const mongoose = require('mongoose');
const { Schema, SchemaTypes, model } = mongoose;

// connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// schema setup
const userSchema = Schema({
  username: {
    type: String,
    required: true
  }
});

const exerciseSchema = Schema({
  user: {
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: () => Date.now()
  }
});

// schema model setup
const User = model('User', userSchema);
const Exercise = model('Exercise', exerciseSchema);

// basic configuration

// body parsing middleware
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// create new user endpoint
app.post('/api/users', (req, res) => {
  (async () => {
    // variable setup
    const username = req.body.username;

    // add user
    const user = await User.create({
      username: username
    })
    
    // JSON response
    res.json({
      username: user.username,
      _id: user._id
    });
    
    // console feedback
    console.log(`user created: ${user}`);
  })();
})

// get all users endpoint
app.get('/api/users', (req, res) => {
  (async () => {
    const users = await User.find({}).exec();
    res.send(users);
  })();
});

// add exercise endpoint
app.post('/api/users/:_id/exercises', (req, res) => {
  (async () => {
    // variable setup
    // account for both form body or params
    const id = req.body[':_id'] ? req.body[':_id'] : req.params['_id'];
    const description = req.body.description;
    // convert duration to number data type
    const duration = Number(req.body.duration);
    // if no date provided, use current date
    const date = req.body.date ? req.body.date : moment(Date.now()).format('YYYY-MM-DD');

    // add exercise if user exists
    const user = await User.findById(id).exec();
    if (user) {
      const exercise = await Exercise.create({
        user: user._id,
        description: description,
        duration: duration,
        date: date
      });
      
      // JSON response
      res.json({
        _id: user._id,
        username: user.username,
        date: new Date(date).toDateString(),
        duration: exercise.duration,
        description: exercise.description
      });
      
      // console feedback
      console.log(`exercise added: ${exercise}`);
    } else {
      console.log(`user ${id} not found`);
    }
  })();
});

// get user exercise logs endpoint
app.get('/api/users/:_id/logs', (req, res) => {
  (async () => {
    // variable setup
    const id = req.params['_id'];
    const from = req.query.from;
    const to = req.query.to;
    const limit = Number(req.query.limit);

    // get user logs if user exists
    const user = await User.findById(id).exec();
    if (user) {
      // get specific user's exercises
      let exercises = await Exercise.find({ user: user._id }, '-_id description duration date').exec();

      // narrow down exercises list based on query options
      if (from) {
        exercises = exercises.filter((exercise) => {
          return exercise.date > new Date(from);
        });
      }
      if (to) {
        exercises = exercises.filter((exercise) => {
          return exercise.date < new Date(to);
        });
      }
      if (limit) {
        exercises = exercises.slice(0, limit)
      }
      
      // format every date correctly
      exercises = exercises.map((exercise) => {
        return {
          ...exercise['_doc'],
          date: exercise.date.toDateString()
      }});
      
      // JSON response
      res.json({
        _id: user._id,
        username: user.username,
        count: exercises.length,
        log: exercises
      });
      
      // console feedback
      console.log(`user ${id} logs retrieved`);
    } else {
      console.log(`user ${id} not found`);
    }
  })();
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
