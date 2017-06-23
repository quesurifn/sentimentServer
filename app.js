'use strict';

const express = require('express');
const app = express();
const http = require('http')
const Twit = require('twit')
var sentiment = require('sentiment');
const WebSocket = require('ws');
const port = 3000;

require('dotenv').config()

const server = http.createServer(app);
const tweets = new WebSocket.Server({ server});



var T = new Twit({
  consumer_key:         process.env.TWITTER_CONSUMER_KEY,
  consumer_secret:      process.env.TWITTER_CONSUMER_SECRET,
  access_token:         process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret:  process.env.TWITTER_ACCESS_SECRET,
})

app.get('/', function(req, res) {
  res.send('Congratulations, you sent a GET request!');
  console.log('Received a GET request and sent a response');
});

tweets.on('connection', function(ws, req) {
  var streamedTweets = [];
  var tweetsWithLoc =[];
  const stream = T.stream('statuses/filter', { track: ['POTUS', 'trump', 'president', 'realDonaldTrump'], locations: '-180,-90,180,90' })
  stream.on('tweet', function(tweet){
    streamedTweets.push(tweet.text)

    //Tweet location
    if(tweet.coordinates) {
      if(tweet.coordinates != null) {
          let outputPoint = {"lat": data.coordinates.coordinates[0],"lng": data.coordinates.coordinates[1]};
          let locSentiment = sentiment(tweet.text)
          tweetsWithLoc.push({"tweet": tweet.text, "location": outputPoint, "sentiment": locSentiment});
      }
    }
    if(tweetsWithLoc.length === 40) {
     ws.send(JSON.stringify({"location":tweetsWithLoc}))
     tweetsWithLoc.length = 0;
    }

    //overall sentiment & stuff
    if(streamedTweets.length === 10) {
      var trumpSentiment = sentiment(streamedTweets.join());
      ws.send(JSON.stringify({"main": {"sentiment": trumpSentiment, "featuredTweet": streamedTweets[100] }}))
      console.log(trumpSentiment)
      //clear array & start over
      streamedTweets.length = 0;
    }
  })
})


server.listen(port, function listening() {
  console.log('Listening on %d', server.address().port);
});
