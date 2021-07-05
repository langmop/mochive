const express = require("express");
const Tmdb = require("tmdb").Tmdb;
const mongoose = require("./config/mongoose");
const Comment = require("./model/comment");
const saveData = require("./controller/saveUser");
const bcrypt = require("bcrypt");
const path = require("path");
const session = require("express-session");
const app = express();
const passport = require("passport");
const localStrategy = require("passport-local");
const con = require("./config/mysql");
const User = require("./model/user");
app.use(express.static(__dirname + "/public"));
const apiKey = "1217352f09c7fa5f7527202dc0ad7c4f";
const tmdb = new Tmdb(apiKey);
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
app.set("views", path.join(__dirname, "views"));
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

async function getMovieImageLink(movie_obj) {
  const imageLink = [];
  const movieNames = [];
  const description = [];
  const movieId = [];
  const rating = [];
  for (movie in movie_obj) {
    var movie_name = null;
    if (movie_obj[movie].name != undefined) {
      movie_name = movie_obj[movie].name;
    }
    const resultOut = await tmdb.get("search/movie", {
      query: movie_name,
    });
    if (resultOut.results[0] === undefined) {
      continue;
    } else {
      if (resultOut.results[0].posterPath != "") {
        imageLink.push(
          "https://image.tmdb.org/t/p/w200" + resultOut.results[0].posterPath
        );
        movieNames.push(resultOut.results[0].title);
        description.push(resultOut.results[0].overview);
        movieId.push("/movie/" + movie_obj[movie].id);
        if (movie_obj[movie].rankscore == null) {
          rating.push(8);
        } else {
          rating.push(movie_obj[movie].rankscore);
        }
      }
    }
  }

  return {
    imageLinks: imageLink,
    movieNames: movieNames,
    description: description,
    movieId: movieId,
    rating: rating,
  };
}

app.get("/movie/:movie_id", async (req, res) => {
  const comments = await Comment.find({ movie: req.params.movie_id });
  // comments = "this is the first Comment";

  const genreQuery =
    "select genre from movies_genres where movie_id in (select id from movies where id=" +
    req.params.movie_id +
    ");";
  const actorsQuery =
    "select first_name, last_name from actors where id in(select actor_id from roles where movie_id in (select id from movies where id=" +
    req.params.movie_id +
    "));";
  const directorsQuery =
    "select first_name, last_name from directors where id in (select director_id from movies_directors where movie_id in (select id from movies where" +
    req.params.movie_id +
    "));";
  const nameQuery =
    "select name from movies where id =" + req.params.movie_id + ";";

  const rankQuery =
    "select rankscore from movies where id =" + req.params.movie_id + ";";
  const yearQuery =
    "select year from movies where id =" + req.params.movie_id + ";";
  const allResult =
    "select * from movies where id =" + req.params.movie_id + ";";
  const major =
    genreQuery + actorsQuery + nameQuery + rankQuery + yearQuery + allResult;
  const data = check(req, res);
  const finalComments = await Comment.find({ movie: req.params.movie_id });

  async function submission() {
    con.query(major, async (err, result) => {
      if (err) {
        console.log(err);
        return null;
      }
      var comments = [];
      var genre = [];
      var name = "";
      var year = "";
      var actors = [];
      var rank = "";
      var email = [];

      for (x in result[0]) {
        genre.push(result[0][x].genre);
      }
      for (x in result[1]) {
        for (y in result[1][x]) {
          actors.push(result[1][x][y] + result[1][x][y]);
        }
      }

      name = result[2][0].name;
      if (result[3][0].rankscore == null) {
        rank = 8.0;
      } else {
        rank = result[3][0].rankscore;
      }

      year = result[4][0].year;
      const movieObj = await getMovieImageLink(result[5]);
      var link = "";
      var description = "";
      if (movieObj.imageLinks.length != 0) {
        link = movieObj.imageLinks[0].replace("w200", "w500");
        description = movieObj.description[0];
      }
      for (x in finalComments) {
        comments.push(finalComments[x].comment);
        email.push(finalComments[x].email);
      }
      const showObj = {
        genre: genre,
        name: name,
        actors: actors,
        rank: rank,
        year: year,
        link: link,
        description: description,
      };
      data.showObj = showObj;
      if (data.name == null) {
        return res.render("movie", data);
      } else {
        data["comments"] = comments;
        data["post_req"] = "/comment/" + req.params.movie_id;
        data["userEmail"] = data.email;
        data["email"] = email;
        res.render("movie.ejs", data);
      }
    });
  }
  submission();
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
    console.log(err);
    res.redirect("/movie/" + req.params.movie_id);
  }
});

app.post("/query", async (req, res) => {
  const movie_name = req.body.movie_name;
  const query =
    "select * from movies where name like " + "'" + movie_name + "%'" + ";";
  con.query(query, async function (err, result) {
    const links = await getMovieImageLink(result);
    if (err) throw err;
    res.render("showMovies", {
      movies: result,
      next_url: "/next/" + movie_name + "/1",
      prev_url: "/prev/" + movie_name + "/0",
      links: links,
    });
  });
});

app.get("/next/:movie_name/:page_no", async (req, res) => {
  const movie_name = req.params.movie_name;
  const query =
    "select * from movies where name like " +
    "'" +
    movie_name +
    "%'" +
    String(Number(req.params.page_no) * 5) +
    ";";
  con.query(query, async function (err, result) {
    if (err) throw err;
    const links = await getMovieImageLink(result);
    if (result.length < 5) {
      res.render("showMovies", {
        movies: result,
        next_url: "/next/" + movie_name + "/0",
        prev_url: "/prev/" + movie_name + "/1",
        links: links,
      });
    } else {
      res.render("showMovies", {
        movies: result,
        next_url:
          "/next/" + movie_name + "/" + String(Number(req.params.page_no) + 1),
        prev_url:
          "/prev/" + movie_name + "/" + String(Number(req.params.page_no) - 1),
        links: links,
      });
    }
  });
});

app.get("/prev/:movie_name/:page_no", async (req, res) => {
  const movie_name = req.params.movie_name;
  const query =
    "select * from movies where name like " +
    "'" +
    movie_name +
    "%' limit 5 offset " +
    String(Number(req.params.page_no) * 5) +
    ";";
  con.query(query, async function (err, result) {
    const links = await getMovieImageLink(result);
    if (err) throw err;

    if (Number(req.params.page_no) <= 1) {
      res.render("showMovies", {
        movies: result,
        next_url: "/next/" + movie_name + "/1",
        prev_url: "/prev/" + movie_name + "/0",
        links: links,
      });
    } else {
      res.render("showMovies", {
        movies: result,
        next_url:
          "/next/" + movie_name + "/" + String(Number(req.params.page_no) + 1),
        prev_url:
          "/prev/" + movie_name + "/" + String(Number(req.params.page_no) - 1),
        links: links,
      });
    }
  });
});
app.get("/", async (req, res) => {
  const query = "select * from movies order by year desc limit 30;";

  con.query(query, async function (err, result) {
    const movieObj = await getMovieImageLink(result);
    if (err) throw err;
    const ifUser = check(req, res);
    ifUser.imageLinks = movieObj.imageLinks;
    ifUser.movieNames = movieObj.movieNames;
    ifUser.description = movieObj.description;
    ifUser.movieId = movieObj.movieId;
    ifUser.rating = movieObj.rating;
    res.render("index.ejs", ifUser);
  });
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

app.post("/search", (req, res) => {
  res.redirect("/");
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
    console.log("listening on port ", 5000);
  } else {
    console.log(err);
  }
});
