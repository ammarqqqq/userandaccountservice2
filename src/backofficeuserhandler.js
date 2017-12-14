const redisClient = require('redis').createClient;

//const serviceLookupHandler = require("./consulLookup.js");
var redis = null;
//serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
  //redis = redisClient(serverAddress.port, serverAddress.address);
  redis = redisClient(6378, 'userandaccountredis');
//});

const User = require('./models/user');

/**
 * @module backofficeuserhandler
 * @author Jonathan Søyland-Lier <Jonathan@fintechinnovation.no>
 * */

var backofficeuserhandler = (function() {
  var deps = {};

  deps.activateOrDeactivateUser = function(phonenr, activateUser) {
    return new Promise(
      function(resolve , reject) {
        User.findOne({
            phone: phonenr
        })
        .exec(function(err, user){
          if (err) {
              reject(err);
          } else {
            if (activateUser) {
                user.status = "active";
            } else {
              user.status = "pending_confirmation";
            }
            user.save(function(err, savedUser) {
            if (err) reject(err);
            console.log("saved " + savedUser);
            resolve(savedUser);
            });
          }
        });
      }
    );
  }

  deps.deleteUser = function(phonenr) {
    return new Promise(
      function(resolve , reject) {
        User.findOne({
            phone: phonenr
        })
        .exec(function(err, user){
          if (err) {
              reject(err);
          } else {
            user.remove(function(err, deletedUser) {
            //user.save(function(err, savedUser) {
            if (err) reject(err);
            console.log("deleted " + deletedUser);
            resolve(deletedUser);
            });
          }
        });
      }
    );
  }


/**
 * Activate or deactivate user.
 * @param {string} phonenr - users model phone ref.
 * @param {boolean} activateUser - if the user will be activated or deactivated
 */
  function activateOrDeactivateUser(phonenr, activateUser) {
    return deps.activateOrDeactivateUser(phonenr, activateUser);
  }

  /**
 * Delete user.
 * @param {string} phonenr - users model phone ref.
 */
  function deleteUser(phonenr) {
    return deps.deleteUser(phonenr);
  }

return {
    "activateOrDeactivateUser" : activateOrDeactivateUser,
    "deleteUser": deleteUser,
    "deps": deps
  };
})();

module.exports = backofficeuserhandler;
