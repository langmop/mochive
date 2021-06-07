const express = require("express");
const mongoose = require("./config/mongoose");
const Comment = require("./model/comment");
const saveData = require("./controller/saveUser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const app = express();
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./model/user");
app.use(
  express.urlencoded({
    extended: false,
  })
);

app.use(
  session({
    secret: "W$q4=25*8%v-}UV",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

function check(req, res) {
  if (req.user == undefined) {
    return {
      name: null,
    };
  } else {
    return {
      name: req.user.name,
      email: req.user.email,
    };
  }
}

app.get("/movie/:movie_id", async (req, res) => {
  const comments = await Comment.find({ movie: req.params.movie_id });
  // comments = "this is the first Comment";
  const data = check(req, res);
  if (data.name == null) {
    return res.render("movie", data);
  } else {
    data["comments"] = comments;
    data["post_req"] = "/comment/" + req.params.movie_id;
    res.render("movie.ejs", data);
  }
});

app.post("/comment/:movie_id", async (req, res) => {
  const data = new Comment({
    movie: req.params.movie_id,
    comment: req.body.comment,
    email: req.body.email,
  });
  try {
    const result = await data.save();
    res.redirect("/movie/" + req.params.movie_id);
  } catch (err) {
    res.redirect("/movie/" + req.params.movie_id);
  }
});

app.get("/", (req, res) => {
  res.render("index.ejs", check(req, res));
});

app.get("/login", isLoggedOut, (req, res) => {
  res.render("login");
});

app.get("/register", isLoggedOut, (req, res) => {
  res.render("register");
});

app.get("/dashboard", isLoggedIn, (req, res) => {
  res.render("dashboard", {
    name: req.user.name,
  });
});
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.post("/register", async (req, res) => {
  try {
    const encryptedPassword = await bcrypt.hash(req.body.password, 10);
    const result = await saveData(
      encryptedPassword,
      req.body.name,
      req.body.email
    );

    if (result) {
      res.redirect("/login");
    } else {
      res.redirect("/register");
    }
  } catch (err) {
    res.redirect("/register");
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    successRedirect: "/",
  })
);

passport.use(
  new localStrategy(
    {
      usernameField: "email",
    },
    async (email, password, done) => {
      const current_user = await User.findOne({ email: email });
      if (current_user == null) {
        return done(null, false);
      } else {
        try {
          const compared = await bcrypt.compare(
            password,
            current_user.password
          );
          if (compared) {
            return done(null, current_user);
          } else {
            return done(null, false);
          }
        } catch (err) {
          return done(err);
        }
      }
    }
  )
);

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.redirect("/login");
  }
}
function isLoggedOut(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  } else {
    return next();
  }
}

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, { email: user.email, name: user.name });
});

app.listen(4000, (err) => {
  if (!err) {
    console.log("listening on port ", 3000);
  } else {
    console.log(err);
  }
});
