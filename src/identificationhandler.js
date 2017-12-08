const redisClient = require('redis').createClient;
//const serviceLookupHandler = require("./consulLookup.js");
var redis = null;
var server = process.env.DNSDOMAIN;
//serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
  //redis = redisClient(serverAddress.port, serverAddress.address);
  redis = redisClient(6379, 'userandaccountredis');
//});
const Useridentification = require('./models/useridentification');
const logger = require('./logger.js')

var useridentificationhandler = (function() {
  var deps = {};

  deps.getIdentification = function(id) {
    return new Promise(
      function(resolve , reject) {
        redis.get(id.toString(), function (err, reply) {
          if (err) {
            reject(err);
          } else {
            if (!reply) {
              Useridentification.findOne({
                  user_owner_id: id
              })
              .exec(function(err, identification){
                if (err) {
                    reject(err);
                } else {
                  redis.hmset(identification._id, JSON.stringify(v), function () {
                    resolve(profile);
                  });
                }
              });
            } else {
              // TODO: put in resin
              resolve(reply);
            }
          }
        });
      }
    );
  }

  deps.createIdentification = function(id, jsondata) {
    return new Promise(
      function(resolve , reject) {

        var userIdentification = new Useridentification({
          user_owner_id : id,
          scanData: jsondata
        });


        userIdentification.save(function(err, saved) {
          if (err) reject(err);
          logger.info("saved " + saved);
          if (!saved) reject("Most likely a duplicate or illegal profile: validation needed")
          redis.hmset(saved._id.toString(), JSON.stringify(saved), function () {
            resolve(saved);
          });
        });
    });
  }

  function getIdentification(id) {
    return deps.getIdentification(id);
  }

  function createIdentification(id, jsondata) {
    return deps.createIdentification(id, jsondata);
  }

  return {
    "getIdentification": getIdentification,
    "createIdentification": createIdentification,
    "deps": deps
  };
})();

module.exports = useridentificationhandler;
