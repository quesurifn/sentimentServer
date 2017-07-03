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


      // Variables outside of stream
      let streamedTweets = [];
      let tweetsWithLoc =[];
      let pos = 0;
      let neu = 0;
      let neg = 0;

      const stream = T.stream('statuses/filter', { track: ['POTUS', 'trump', 'president', 'realDonaldTrump'], locations: '-180,-90,180,90' })
      stream.on('tweet', function(tweet){
        let individualSent = sentiment(tweet.text)
        
        
        if (individualSent === 0) {
          neu++
        } else if (individualSent > 0) {
          pos++
        } else if (individualSent < 0) {
          neg++
        } else {
          console.log('Sentiment cant parse')
        }

        // push tweets to array
        streamedTweets.push(tweet.text)
        
        //Tweet location

        // if tweet has cooridnates
        if(tweet.coordinates) {
          //and if coordiantes don't = null
          if(tweet.coordinates != null) {
              
              //get location sentiment and lng / lat
              let outputPoint = {"lat": tweet.coordinates.coordinates[0],"lng": tweet.coordinates.coordinates[1]};
              let locSentiment = sentiment(tweet.text)

              // push to the location array 
              tweetsWithLoc.push({"tweet": tweet.text, "location": outputPoint, "sentiment": locSentiment});
          }
        }

        // When there are 40 tweets push to client
        if(tweetsWithLoc.length === 40) {
          ws.send(JSON.stringify({"location":tweetsWithLoc}), function(error) {
            if (error) {
              console.log(error)
            }
        })

        // resset array
        tweetsWithLoc.length = 0;
        }

        //send streamed tweets off when the array hits 50 tweets
        if(streamedTweets.length === 50) { 

          //join all the tweets in the array to a single string
          let trumpSentiment = sentiment(streamedTweets.join());
        

          // FIRE!!
          ws.send(JSON.stringify({"main": {"sentiment": trumpSentiment, "featuredTweet": streamedTweets[19], "pos": pos, "neg": neg, "neu": neu }}), function(error)   {
            if (error) {
              console.log(error)
            }
          })


          //clear array & start over

          streamedTweets.length = 0;
          pos = 0
          neg = 0
          neu = 0
        }
      })
    })


    // clean up connection
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