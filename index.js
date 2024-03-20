const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      require: true,
    },
  },
  { versionKey: false }
);
const exerciseSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      require: true,
    },
    description: {
      type: String,
      require: true,
    },
    duration: {
      type: Number,
      require: true,
    },
    date: {
      type: String,
      require: true,
    },
  },
  { versionKey: false }
);
const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercises", exerciseSchema);

// database
const createAndSaveUser = (username, done) => {
  new User({ username }).save((err, data) => {
    if (err) return done(err);
    done(null, data);
  });
};

const createAndSaveExercise = (exercise, done) => {
  new Exercise(exercise).save((err, data) => {
    if (err) return done(err);
    done(null, data);
  });
};

const findUserById = (id, done) => {
  User.findById(id).lean().exec((err, data) => {
    if (err) return done(err);
    done(null, data);
  });
};

const findLogsByUserId = ({ userId, from, to, limit }, done) => {
  let query = Exercise.find({
    userId,
    ...(from &&
      to && {
        date: {
          $gte: from,
          $lte: to,
        },
      }),
  });
  if (limit) query = query.limit(Number(limit));

  query.select("-_id -userId").lean().exec((err, data) => {
    if (err) return done(err);
    done(null, data);
  });
};

const getListUser = (done) => {
  User.find().exec("find", (err, data) => {
    if (err) return done(err);
    done(null, data);
  });
};

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app
  .route("/api/users")
  .post((req, res) => {
    createAndSaveUser(req.body.username, (err, data) => {
      if (err) return res.status(500).send({ error: "error" });
      res.send(data);
    });
  })
  .get((req, res) => {
    getListUser((err, data) => {
      if (err) return res.status(500).send({ error: "error" });
      res.send(data);
    });
  });

app.route("/api/users/:_id/exercises").post((req, res) => {
  findUserById(req.params._id, (err, user) => {
    if (err) return res.status(500).send({ error: "error" });
    createAndSaveExercise(
      {
        userId: user._id,
        ...req.body,
        // date: req.body.date && new Date(req.body.date).toDateString() || new Date().toDateString() ,
        date: req.body.date || new Date().toISOString().split("T")[0],
      },
      (err, exercise) => {
        if (err) return res.status(500).send({ error: "error" });
        const resData = {
          username: user.username,
          description: exercise.description,
          duration: exercise.duration,
          date: new Date(exercise.date).toDateString(),
          _id: user._id,
        };
        res.send(resData);
      }
    );
  });
});

app.route("/api/users/:_id/logs").get((req, res) => {
  findUserById(req.params._id, (err, user) => {
    if (err) return res.status(500).send({ error: "error" });
    findLogsByUserId({ userId: req.params._id, ...req.query }, (err, logs) => {
      if (err) return res.status(500).send({ error: "error" });

      res.send({
        ...user,
        count: logs.length,
        log: logs.map((item) => ({
          ...item,
          date: new Date(item.date).toDateString(),
        })),
      });
    });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});