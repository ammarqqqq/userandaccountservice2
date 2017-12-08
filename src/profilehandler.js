const redisClient = require('redis').createClient;

//const serviceLookupHandler = require("./consulLookup.js");
var redis = null;
//serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
  //redis = redisClient(serverAddress.port, serverAddress.address);
redis = redisClient(6379, 'userandaccountredis');
//});

const Profile = require('./models/profile');
const logger = require('./logger.js')

var profilehandler = (function() {
  var deps = {};

  deps.getProfile = function(id) {
    return new Promise(
      function(resolve , reject) {
        redis.get(id.toString(), function (err, reply) {
          if (err) {
            reject(err);
          } else {
            if (!reply) {
              Profile.findOne({
                  user_owner_id: id
              })
              .exec(function(err, profile){
                if (err) {
                    reject(err);
                } else {
                  redis.hmset(profile._id.toString(), JSON.stringify(profile), function () {
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

  deps.createProfile = function(id, jsondata) {
    return new Promise(
      function(resolve , reject) {

        var profile = new Profile({
          user_owner_id: id,
          img: jsondata.img,
          img_img: jsondata.imgimg,
          firstname: jsondata.firstname,
          lastname: jsondata.lastname,
          streetadress1: jsondata.streetadress1,
          streetadress2: jsondata.streetadress2,
          postnumber: jsondata.postummer,
          country: jsondata.country
        });

        profile.save(function(err, savedProfile) {
          if (err) reject(err);
          logger.info("saved " + savedProfile);
          if (!savedProfile) reject("Most likely a duplicate or illegal profile: validation needed")
          redis.hmset(savedProfile._id, JSON.stringify(savedProfile), function () {
            resolve(savedProfile);
          });
        });
    });
  }

  function getProfile(id) {
    return deps.getProfile(id);
  }

  function createProfile(id, jsondata) {
    return deps.createProfile(id, jsondata);
  }

  return {
    "getProfile": getProfile,
    "createProfile": createProfile,
    "deps": deps
  };
})();

module.exports = profilehandler;
