    const express = require('express');
    const app = express();
    const http = require('http')
    const Twit = require('twit')
    const sentiment = require('sentiment');
    const WebSocket = require('ws');
    const port = process.env.PORT || 3000;
    const cluster = require('cluster');
    require('dotenv').config()

    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });

    const T = new Twit({
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
    })

      // Variables outside of stream
      let streamedTweets = [];
      let tweetsWithLoc =[];
      let pos = 0;
      let neu = 0;
      let neg = 0;
      let scoreArray = [];
      let scoreArrayLength = 0;
      let average = 0;

      const stream = T.stream('statuses/filter', { track: ['POTUS', 'trump', 'president', 'realDonaldTrump'], locations: '-180,-90,180,90', language: 'en' })
      stream.on('tweet', function(tweet) {
        console.log(tweet.text)
        let individualSent = sentiment(tweet.text)
        
        if (individualSent.score > 0) {
          pos++
        } else if (individualSent.score < 0) {
          neg++
        } else if (individualSent.score === 0) {
          neu++
        }

        if (individualSent.score > 0) {
          scoreArray.push(individualSent.score)
        } else if (individualSent.score < 0) {
          scoreArray.push(individualSent.score * 1.35)
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
            console.log('40')
          try { 

        
              wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({"location":tweetsWithLoc}));
                }
              });
          

          } catch(e) {
            console.log(e)
          }

        // resset array
        tweetsWithLoc.length = 0;
        }

        //send streamed tweets off when the array hits 50 tweets
        if(streamedTweets.length === 50) { 

          scoreArrayLength = scoreArray.length
          average = scoreArray.reduce((a, b) => a + b, 0);
          average = average / scoreArrayLength;

          average = average.toFixed(4);

          average = parseFloat(average)

          //join all the tweets in the array to a single string
          let trumpSentiment = sentiment(streamedTweets.join());
        

          // FIRE!!
          try {       

  
                wss.clients.forEach(function each(client) {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({"main": {"sentiment": trumpSentiment, "featuredTweet": streamedTweets[19], "pos": pos, "neg": neg, "neu": neu, "average": average}}))
                  }
                });
             
      
    } catch(e) {
            console.log(e)
          }
            
          //clear array & start over
          scoreArrayLength = 0;
          scoreArray.length = 0;
          streamedTweets.length = 0;
          pos = 0
          neg = 0
          neu = 0
        }
      }) 

      //end stream

      stream.on('limit', function (limitMessage) {
        console.log(limitMessage)
      })

      stream.on('reconnect', function (reconnect) {
        console.log(reconnect)
      })

      stream.on('error', function(err) {
        console.log(err)
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