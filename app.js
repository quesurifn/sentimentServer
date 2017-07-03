'use strict';

// Include the cluster module
var cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {

    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for dying workers
    cluster.on('exit', function (worker) {

        // Replace the dead worker, we're not sentimental
        console.log('Worker %d died :(', worker.id);
        cluster.fork();

    });

// Code to run if we're in a worker process
} else {

    const express = require('express');
    const app = express();
    const http = require('http')
    const Twit = require('twit')
    var sentiment = require('sentiment');
    const WebSocket = require('ws');
    const port = process.env.PORT || 3000;
    var cluster = require('cluster');
    require('dotenv').config()

    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });

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


    app.get('/', function(req, res) {
      res.send('Congratulations, you sent a GET request!');
      console.log('Received a GET request and sent a response');
    });


    function heartbeat() {
      console.log('heartbeat')
      this.isAlive = true;
    }

    wss.on('connection', function(ws, req) {
      
      ws.isAlive = true;
      ws.on('pong', heartbeat);

      let streamedTweets = [];
      let tweetsWithLoc =[];
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

        ws.send(JSON.stringify({"location":tweetsWithLoc}), function(error) {
          if (error) {
            console.log(error)
          }
        })

        tweetsWithLoc.length = 0;
        }

        //overall sentiment & stuff
        if(streamedTweets.length === 50) { 
          var trumpSentiment = sentiment(streamedTweets.join());


          ws.send(JSON.stringify({"main": {"sentiment": trumpSentiment, "featuredTweet": streamedTweets[19] }}), function(error)   {
            if (error) {
              console.log(error)
            }
          })


          //clear array & start over
          streamedTweets.length = 0;
        }
      })
    })

    const interval = setInterval(function ping() {
      wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping('', false, true);
      });
    }, 1000);


  server.listen(port, function listening() {
    console.log('Listening on %d', server.address().port);
  });

}