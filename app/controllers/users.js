const Mongoose = require("mongoose");
const Tweet = Mongoose.model("Tweet");
const User = Mongoose.model("User");
const Analytics = Mongoose.model("Analytics");

/**
 * logAnalytics - Gets all the request and feeds to our analytics
 * system
 *
 * @param  {type} req Request
 */
function logAnalytics(req) {
  const url = req.protocol + "://" + req.get("host") + req.originalUrl;
  const analytics = new Analytics({
    ip: req.ip,
    user: req.user,
    url: url
  });
  analytics.save(err => {
    if (err) {
      console.log(err);
    }
  });
}

exports.signin = (req, res) => {};

exports.authCallback = (req, res) => {
  res.redirect("/");
};

exports.login = (req, res) => {
  res.render("users/login", {
    title: "Login",
    message: req.flash("error")
  });
};

exports.signup = (req, res) => {
  res.render("users/login", {
    title: "Sign up",
    user: new User()
  });
};

exports.logout = (req, res) => {
  logAnalytics(req);
  req.logout();
  res.redirect("/login");
};

exports.session = (req, res) => {
  res.redirect("/");
};

exports.create = (req, res, next) => {
  logAnalytics(req);
  const user = new User(req.body);
  user.provider = "local";
  user.save()
    .catch( error => {
      return res.render("users/login", { errors: err.errors, user: user });
    })
    .then( () => {
      return req.login(user);
    })
    .then( () => {
      return res.redirect("/");
    })
    .catch( error => {
      return next(error);
    });
}

exports.list = (req, res) => {
  logAnalytics(req);
  const page = (req.param("page") > 0 ? req.param("page") : 1) - 1;
  const perPage = 5;
  const options = {
    perPage: perPage,
    page: page,
    criteria: {github: { $exists: true}},
  };
  let users, count;
  User.list(options)
    .then( result => {
      users = result;
      return User.count();
    })
    .then( result => {
      count = result;
      res.render("users/list", {
        title: "List of Users",
        users: users,
        page: page + 1,
        pages: Math.ceil(count / perPage)
      });
    })
    .catch( error => {
      return res.render("500");
    });
}

exports.show = (req, res) => {
  logAnalytics(req);
  const user = req.profile;
  const reqUserId = user._id;
  const userId = reqUserId.toString();
  const page = (req.param("page") > 0 ? req.param("page") : 1) - 1;
  const options = {
    perPage: 100,
    page: page,
    criteria: { user: userId }
  };
  let tweets, tweetCount;
  let followingCount = user.following.length;
  let followerCount = user.followers.length;

  Tweet.list(options)
    .then( result => {
      tweets = result;
      return Tweet.countUserTweets(reqUserId);
    })
    .then( result => {
      tweetCount = result;
      res.render("users/profile", {
        title: "Tweets from " + user.name,
        user: user,
        tweets: tweets,
        tweetCount: tweetCount,
        followerCount: followerCount,
        followingCount: followingCount
      });
    })
    .catch( error => {
      return res.render("500");
    })
}

exports.user = (req, res, next, id) => {
  logAnalytics(req);
  User.findOne({ _id: id }).exec((err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(new Error("failed to load user " + id));
    }
    req.profile = user;
    next();
  });
};

exports.showFollowers = (req, res) => {
  let user = req.profile;
  let followers = user.followers;
  let userFollowers = User.find({ _id: { $in: followers } }).populate(
    "user",
    "_id name username"
  );

  userFollowers.exec((err, users) => {
    if (err) {
      return res.render("500");
    }
    const name = user.name ? user.name : user.username;
    res.render("users/followers", {
      title: "Followers of " + name,
      followers: users
    });
  });
};

exports.showFollowing = (req, res) => {
  let user = req.profile;
  let following = user.following;
  let userFollowing = User.find({ _id: { $in: following } }).populate(
    "user",
    "_id name username"
  );
  userFollowing.exec((err, users) => {
    if (err) {
      res.render("500");
    }
    const name = user.name ? user.name : user.username;
    res.render("users/following", {
      title: "Followed by " + name,
      following: users
    });
  });
};
