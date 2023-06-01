'use strict';
const {MongoClient} = require('mongodb');
const hash = require('crypto').createHash;
//const { env } = require('node:process');


async function mongodb_main(client, ip_hash, symbol, like){

  try {
    // Connect to the MongoDB cluster
    await client.connect();
    let response = [];

    // Make the appropriate DB calls
    if (typeof symbol == 'string') {
      if (like && ((await isLiked(client, symbol, ip_hash)) == false)) {
        await increaseLikes(client, symbol, ip_hash);
      }
      // get like count
      const cnt = await getLikeCount(client, symbol);
      response.push(cnt); 
    } else {
      if (like) {
        // increase like counter for both symbols, if not already liked by this ip
        for (let smb in symbol) {
          if ((await isLiked(client, smb, ip_hash)) == false) {
            await increaseLikes(client, smb, ip_hash);
          }
        }
      }
      // get like count for both
      const cnt1 = await getLikeCount(client, symbol[0]);
      const cnt2 = await getLikeCount(client, symbol[1]);
      // calculate rel_likes
      response = [cnt1-cnt2, cnt2-cnt1];
    }

    return response; 

  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}


module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){

      const client = new MongoClient(env.DB);

      const symbol = req.query.stock;
      const like = req.query.like;
      const ip_hash = hash('sha1')
        .update(req.ip)
        .update(hash('sha1').update(env.SALT, 'utf8').digest('hex'))
        .digest('hex');

      mongodb_main(client, ip_hash, symbol, like).then((likes => {
        if (typeof symbol == 'string') {
          fetchAsync(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`).then((data => {
            res.json({"stock": symbol, "price": data.latestPrice, "likes": likes[0]});
        }));
        } else {
          const ret_arr = [];
          fetchAsync(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol[0]}/quote`)
            .then((data => {ret_arr.push({"stock": symbol[0], "price": data.latestPrice, "rel_likes": likes[0]});}))
            .then(
              fetchAsync(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol[1]}/quote`).then((data => {
                ret_arr.push({"stock": symbol[1], "price": data.latestPrice, "rel_likes": likes[1]});
                res.json({"stockData": ret_arr});
              }))
            );
        }
      }));
    });
};

async function fetchAsync (url) {
  try {
    const response = await fetch(url);
    const jsonData = await response.json();
    return jsonData;
  } catch (error) {
    console.error(error);
  }
}

async function getLikeCount(client, symbol) {
  const counter_exists = await client.db("stockchecker").collection("count").findOne({symbol: symbol});
  if (counter_exists) {
    return counter_exists.counter;
  } else {
    return 0;
  }
}

async function increaseLikes(client, symbol, ip_hash) {
  await client.db("stockchecker").collection("log").insertOne({ip: ip_hash, symbol: symbol});
  const counter_exists = await client.db("stockchecker").collection("count").findOne({symbol: symbol});
  if (counter_exists) {
    await client.db("stockchecker").collection("count").updateOne({symbol: symbol}, {$inc: {counter: 1}});
  } else {
    await client.db("stockchecker").collection("count").insertOne({symbol: symbol, counter: 1});
  }
}

async function isLiked(client, symbol, ip_hash) {
  // checks if the symbol was already liked by the ip (returns bool) 
  const result = await client.db("stockchecker").collection("log").findOne({ip: ip_hash, symbol: symbol});

  if (result == null) {
    return true;
  } else {
    return false; 
  }
}