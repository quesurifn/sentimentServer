'use strict';

const express = require('express');
const app = express();
const http = require('http')
const Twit = require('twit')
var sentiment = require('sentiment');

const port = process.env.PORT || 3000;

require('dotenv').config()

const server = http.createServer(app);
let sse = require('sse-express');



var T = new Twit({
  consumer_key:         process.env.TWITTER_CONSUMER_KEY,
  consumer_secret:      process.env.TWITTER_CONSUMER_SECRET,
  access_token:         process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret:  process.env.TWITTER_ACCESS_SECRET,
})


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


app.get('/', sse, function(req, res) {



  var streamedTweets = [];
  var tweetsWithLoc =[];
  const stream = T.stream('statuses/filter', { track: ['POTUS', 'trump', 'president', 'realDonaldTrump'], locations: '-180,-90,180,90' })
  stream.on('tweet', function(tweet){
    streamedTweets.push(tweet.text)

    //Tweet location
    if(tweet.coordinates) {
      if(tweet.coordinates != null) {
          let outputPoint = {"lat": tweet.coordinates.coordinates[0],"lng": tweet.coordinates.coordinates[1]};
          let locSentiment = sentiment(tweet.text)
          tweetsWithLoc.push({"tweet": tweet.text, "location": outputPoint, "sentiment": locSentiment});
      }
    }
    if(tweetsWithLoc.length === 40) {

<<<<<<< HEAD
     ws.send(JSON.stringify({"location":tweetsWithLoc}), function(error) {
       if (error) {
         console.log(error)
       }
     })
=======
     res.sse('message', JSON.stringify({"location":tweetsWithLoc}))
>>>>>>> 79042abf2da2f881d06d788a8465e63c6db7ed2d

     tweetsWithLoc.length = 0;
    }

    //overall sentiment & stuff
    if(streamedTweets.length === 20) { 
      var trumpSentiment = sentiment(streamedTweets.join());


<<<<<<< HEAD
      ws.send(JSON.stringify({"main": {"sentiment": trumpSentiment, "featuredTweet": streamedTweets[19] }}), function(error)   {
        if (error) {
          console.log(error)
        }
      })
=======
      res.sse('message', JSON.stringify({"main": {"sentiment": trumpSentiment, "featuredTweet": streamedTweets[19] }}))
       
>>>>>>> 79042abf2da2f881d06d788a8465e63c6db7ed2d


      console.log(trumpSentiment)
      //clear array & start over
      streamedTweets.length = 0;
    }
  })

});





server.listen(port, function listening() {
  console.log('Listening on %d', server.address().port);
});