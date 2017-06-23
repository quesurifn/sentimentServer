var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

require('dotenv').config()

var Twit = require('twit')

var T = new Twit({
  consumer_key:         process.env.TWITTER_CONSUMER_KEY,
  consumer_secret:      process.env.TWITTER_CONSUMER_SECRET,
  access_token:         process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret:  process.env.TWITTER_ACCESS_SECRET,
})


app.use(function (req, res, next) {
  console.log('middleware');
  req.testing = 'testing';
  return next();
});

app.get('/', function(req, res, next){
  console.log('get route', req.testing);
  res.end();
});

app.ws('/', function(ws, req) {
  ws.on('message', function(msg) {
    console.log(msg);
  });
  console.log('socket', req.testing);
});

app.ws('/tweets', function(ws, req) {
  ws.on('connect', function(req) {
    console.log(req)
    ws.send(req);
  });
  const stream = T.stream('statuses/filter', { track: ['POTUS', 'trump', 'president', 'realDonaldTrump'] })
  stream.on('tweet', function(tweet){
    console.log(tweet)
    ws.send(tweet)
  })
})

app.ws('/trump', function(ws, req) {
  const stream = T.stream('statuses/user_timeline', { screen_name: ['POTUS', 'realDonaldTrump'] })
  stream.on('tweet', function(tweet) {
    console.log(tweet)
    ws.send(tweet)
  })
})


app.listen(3000);
