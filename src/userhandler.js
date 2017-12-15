const User = require('./models/user');
const PhoneHistory = require('./models/phonehistory');
const redisClient = require('redis').createClient;
const mongoose = require('mongoose');
//const serviceLookupHandler = require("./consulLookup.js");
const logger = require('./logger.js')
var redis = null;
//serviceLookupHandler.serviceLookup("microservices_userandaccountredis", '').then(serverAddress => {
//  redis = redisClient(serverAddress.port, serverAddress.address);
//});

/**
 * @module userhandler
 * @author Arne-Richard Hofsøy <arne@fintechinnovation.no>
 * */

function resolveRedis() {
  return new Promise(
    function(resolve , reject) {
      //serviceLookupHandler.serviceLookup("microservices_userandaccountredis", '').then(serverAddress => {
        //redis = redisClient(serverAddress.port, serverAddress.address);
        redis = redisClient(6379, 'microservices_userandaccountredis');
        if (redis) resolve(redis);
        else reject("No redis");
      //});
  });
}

var userhandler = (function() {
  var deps = {};

  deps.confirmCode = function(id, code) {
    console.log("Code: " + code);
    console.log("ID: " + id);
    return new Promise(
      function(resolve , reject) {
        User.findOne({
            _id: id
        })
        .exec(function(err, user){
          if (err) {
              reject(err);
          } else {
            console.log("User: " + JSON.stringify(user));
            if (!user) {
              reject("Could not find user");
            } else {
              if (user.status !== "pending_confirmation") {
                reject("User code is already confirmed");
              } else {
                logger.debug("Generated code: " + user.confirmCode);
                logger.debug("Users code: " + code);
                if (user.confirmCode === code) {
                  user.status = "active";
                  user.confirmCode = '';
                  user.save(function(err, savedUser) {
                    if (err) reject(err);
                    console.log("saved " + savedUser);
                    resolve(savedUser);
                  });
                } else {
                  reject("Code does not match");
                }
              }
            }
          }
        });
      }
    );
  }

  deps.confirmLoginCode = function(id, code) {
    console.log("Code: " + code);
    console.log("ID: " + id);
    return new Promise(
      function(resolve , reject) {
        User.findOne({
            _id: id
        })
        .exec(function(err, user){
          if (err) {
              reject(err);
          } else {
            console.log("User: " + JSON.stringify(user));
            if (!user) {
              reject("Could not find user");
            } else {
              if (user.status !== "active") {
                reject("User is not active");
              } else {
                logger.debug("Generated code: " + user.confirmCode);
                logger.debug("Users code: " + code);
                if (user.confirmCode === code) {
                  user.confirmCode = '';
                  user.save(function(err, savedUser) {
                    if (err) reject(err);
                    console.log("saved " + savedUser);
                    resolve(savedUser);
                  });
                } else {
                  logger.info("User has not been reactivated");
                  reject("Code does not match");
                }
              }
            }
          }
        });
      }
    );
  }
  deps.setCode = function(id, code) {
    return new Promise(
      function(resolve , reject) {
        User.findOne({
            _id: id
        })
        .exec(function(err, user){
          if (err) {
              reject(err);
          } else {
              if (!user) reject("Could not find user");
              else {
                user.confirmCode = code;
                user.save(function(err, savedUser) {
                  if (err) reject(err);
                  console.log("saved " + savedUser);
                  resolve(savedUser);
                });
             }
          }
        });
      }
    );
  }

  deps.updatePhone = function(id, currentPhone, newPhone) {
    return new Promise(
      function(resolve , reject) {
        User.findOne({
            _id: id
        })
        .exec(function(err, user){
          if (err) {
              reject(err);
          } else {
            if(user.mobileNumber === currentPhone) {
              user.mobileNumber = newPhone;
              user.status = "pending_confirmation";
              user.save(function(err, savedUser) {
                if (err) reject(err);
                resolve(savedUser);
              });
            } else {
              logger.error("Current phone " + currentPhone + " is not the same than in DB (" + user.mobileNumber + ")");
              reject("Phone is not correct");
            }
          }
        });
      }
    );
  }

  deps.createPhoneHistory = function(id, currentPhone, newPhone) {
    return new Promise(
      function(resolve , reject) {
        var phoneHistory = new PhoneHistory({
          user_owner_id: new mongoose.mongo.ObjectId(id),
          old_phone: currentPhone,
          new_phone: newPhone
        });
        phoneHistory.save(function(err, savedPhoneHistory) {
          if (err) {
            console.log("error is " + err);
            reject(err);
          } else {
            console.log ("mobile history: " + savedPhoneHistory);
            resolve(savedPhoneHistory);
          }
       });
    });
  }

  deps.updatePassword = function(id, currentPassword, newPassword) {
    return new Promise(
      function(resolve , reject) {
        User.findOne({
            _id: id
        })
        .exec(function(err, user){
          if (err) {
              reject(err);
          } else {
            user.comparePassword(currentPassword, function (err, isMatch) {
                 if (err) {
                   reject(err)
                 }
                 if (!isMatch) reject("Password does not match");
                 user.password = newPassword;
                 user.save(function(err, savedUser) {
                   if (err) reject(err);
                   console.log("saved " + savedUser);
                   resolve(savedUser);
                 });
            });
          }
        });
      }
    );
  }

  deps.resetPassword = function(id, newPassword) {
    console.log("id " + id + " password " + newPassword);
    return new Promise(
      function(resolve , reject) {
        User.findOne({
            _id: id
        })
        .exec(function(err, user){
          console.log("current " + user);
          if (err) {
              reject(err);
          } else {
             user.password = newPassword;
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

  deps.getUser = function(owner_id) {
    return new Promise(
      function(resolve , reject) {
        resolveRedis().then(redis => {
          redis.get(owner_id, function (err, reply) {
            if (err) {
              reject(err);
            } else {
              if (!reply) {
                User.findOne({
                    _id: owner_id
                })
                .exec(function(err, user){
                  if (err) {
                    reject(err);
                  } else {
                    resolve(user);
                  }
                });
              } else {
                // As redis returns a JSON string, we need to create the corresponding object
                resolve(JSON.parse(reply));
              }
            }
          });
        }).catch(err => {
          console.log(err);
          reject(err);
        })
      }
    );
  }

  deps.getUserByMobile = function(mobile) {
    return new Promise(
      function(resolve , reject) {
          User.findOne({
              mobileNumber: mobile
          })
          .exec(function(err, user){
            if (err) {
              reject(err);
            } else {
              resolve(user);
            }
          });
        });
  }

  deps.deleteUnconfirmed = function(mobile) {
    return new Promise(
      function(resolve , reject) {
          User.remove({
              mobileNumber: mobile,
              status: 'pending_confirmation'
          })
          .exec(function(err, user){
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
  }

  deps.createUser = function(phonenr, alias, email, password, pushToken) {
    return new Promise(
      function(resolve , reject) {
        var user = new User({
          mobileNumber: phonenr,
          alias: alias,
          email: email,
          password: password,
          pushToken: pushToken,
          status: "pending_confirmation"
        });
        user.save(function(err, savedUser) {
          if (err) {
            console.log("error is " + err);
            reject(err);
          } else {
            console.log("saved " + savedUser);
            resolve(savedUser);
          }
        });
    });
  }

  /**
 * Get user.
 * @param {string} id - gets user by id.
 */
  function getUser(id) {
    return deps.getUser(id);
  }

  /**
 * Get user.
 * @param {string} mobileNumber - gets user by mobileNumber
 */
  function getUserByMobile(mobileNumber) {
    return deps.getUserByMobile(mobileNumber);
  }

  /**
 * Create user.
 * @param {string} phonenr - users phonenr.
 * @param {string} alias - users name.
 * @param {string} email - users email.
 * @param {string} password - users password.
 * @param {string} pushToken - pushToken from mobile.
 */
  function createUser(phonenr, alias, email, password, pushToken) {
    return deps.createUser(phonenr, alias, email, password, pushToken);
  }

  /**
 * Update user's password.
 * @param {string} id - users model id ref.
 * @param {string} currentpassword - users current password.
 * @param {string} newpassword - users new password.
 */
  function updatePassword(id, currentPassword, newPassword) {
    return deps.updatePassword(id, currentPassword, newPassword);
  }

  /**
 * Update user's phone number.
 * @param {string} id - users model id ref.
 * @param {string} currentphone - users currentphone.
 * @param {string} newphone - users new phone.
 */
  function updatePhone(id, currentPhone, newPhone) {
    return deps.updatePhone(id, currentPhone, newPhone);
  }

  /**
   * Create user's phone change history.
   * @param {string} id - users model id ref.
   * @param {string} currentphone - users currentphone.
   * @param {string} newphone - users new phone.
   */
    function createPhoneHistory(id, currentPhone, newPhone) {
      console.log("createPhoneHistory");
      return deps.createPhoneHistory(id, currentPhone, newPhone);
    }

  /**
 * Confirm Code.
 * @param {string} id - users model id ref.
 * @param {string} code - the code to be confirmed
 */
  function confirmCode(id, code) {
    return deps.confirmCode(id, code);
  }

  /**
   * Confirm active user Code.
   * @param {string} id - users model id ref.
   * @param {string} code - the code to be confirmed
   */
    function confirmLoginCode(id, code) {
      return deps.confirmLoginCode(id, code);
    }

  /**
 * Confirm Code.
 * @param {string} id - users model id ref.
 * @param {string} code - the code to be confirmed
 */
  function setCode(id, code) {
    return deps.setCode(id, code);
  }

  function deleteUnconfirmed(mobile) {
    return deps.deleteUnconfirmed(mobile);
  }

  function resetPassword (id, newPassword) {
    return deps.resetPassword (id, newPassword);
  }

  return {
    "getUser": getUser,
    "getUserByMobile": getUserByMobile,
    "createUser": createUser,
    "updatePassword": updatePassword,
    "updatePhone": updatePhone,
    "createPhoneHistory": createPhoneHistory,
    "confirmCode" : confirmCode,
    "confirmLoginCode": confirmLoginCode,
    "setCode" : setCode,
    "deleteUnconfirmed": deleteUnconfirmed,
    "resetPassword": resetPassword,
    "deps": deps
  };
})();

module.exports = userhandler;
