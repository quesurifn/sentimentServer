var express = require('express');
var router = express.Router();

var Twit = require('twit')
 
var T = new Twit({
  consumer_key:         process.env.TWITTER_CONSUMER_KEY,
  consumer_secret:      process.env.TWITTER_ACCESS_KEY,
  access_token:         process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret:  process.env.TWITTER_TOKEN_SECRET,
})


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.ws('/tweets', function(ws, req) {
  let stream = T.stream('statuses/filter', { track: ['POTUS', 'trump', 'president', 'realDonaldTrump'] })
  stream.on('tweet', function(tweet){
    ws.send(tweet)
  })
})

router.ws('/trump', function(ws, req) {
  let stream = T.stream('statuses/user_timeline', { screen_name: ['POTUS', 'realDonaldTrump'] })
  stream.on('tweet', function(tweet) {
    ws.send(tweet)
  })
})






module.exports = router;
