const express = require('express');
const router = express.Router();
const jwt = require('jwt-simple');
const Config = require('./config'),
config = new Config();
const logger = require('./logger.js')
const request = require('request');

const userhandler = require('./userhandler.js');
const accounthandler = require('./accounthandler.js')
const profilehandler = require('./profilehandler.js');
const useridentificationhandler = require('./identificationhandler.js');
const smshandler =  require('./smshandler.js');
const emailhandler =  require('./emailhandler.js');
const randomGenerator = require("./randomgenerator.js");


// Models
const Account = require('./models/account.js');
const AccountConfig = require('./models/accountconfig.js');
const Iban = require('./models/iban.js');
const User = require('./models/user');
const Useridentification = require('./models/useridentification');

const redisClient = require('redis').createClient;
//const serviceLookupHandler = require("./consulLookup.js");
const fs = require('fs');
const async = require('async');

process.on('unhandledRejection', r => console.log(r));

var redisprefixes = require('./redisprefixes');

router.get('/info', function (req, res) {
  res.send("Welcome to the user service");
});

router.get('/getuser', checkauthentication, function (req, res) {
  //logger.info("getuser", req.body);
  try {
    userhandler.getUser(req.body.owner_id).then(user => {
      if (!user) throw "No data found";
      user.password = "";
      return res.json(user);
    });
  } catch(error) {
    logger.error(error);
    // TODO: this is not right, but could be right :)
    return res.status(403).json({success: false, msg: 'Authentication failed.'});
  }
});

router.get('/getuserbytoken', checkauthentication, function (req, res) {
  logger.info("getuserbytoken", req.body);
  var token = getToken(req.headers);
  try {
    if (!token) throw "No token supplied in get userbytoken";
    var decoded = jwt.decode(token, config.secret);
    if (!decoded) throw "Could not decode user";

    //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
      //var tokenredis = redisClient(serverAddress.port, serverAddress.address);
      var tokenredis = redisClient(6378, 'userandaccountredis');
      tokenredis.get(redisprefixes.token + decoded._id.toString(), function(err, reply) {
        if (err || !reply) {
          console.log("Decoding error: ", err);
          console.log("Decoded reply: ", reply);
          return res.status(401).json({success: false, msg: 'Authentication failed.'});
        }

        /**
        * Check if token is expired
        */
        var now = new Date();
        var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

        var expiryDate = new Date();
        expiryDate.setTime(reply);
        console.log("expires: " + expiryDate);
        console.log("utc    : " + utc);
        console.log("expired: " + (expiryDate < utc));

        if (expiryDate < utc) {
          return res.status(401).json({success: false, msg: 'Authentication expired.'});
        } else {
          var now = new Date();
          var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
          utc.setMinutes(utc.getMinutes() + 1);
          tokenredis.set(redisprefixes.token + decoded._id.toString(), utc.getTime());
        }

        userhandler.getUser(decoded._id).then(user => {
          if (!user) throw "No user found";
          if (user.status !== 'active') throw "User not active";
          // TODO remove password from user object
          delete user.password
          console.log("Found userbytoken & removed password: ",user)
          return res.json(user);
        }).catch(error => {
          logger.error(error);
          throw error;
        });
      });
    //});
  } catch(error) {
    console.log("Error occured " + error);
    logger.error("Error occured " + error)
    return res.status(401).json({success: false, msg: 'Authentication failed.'});
  }
});

router.get('/getuserbymobile', checkauthentication, function (req, res) {
  logger.info("getuser", req.body);
  try {
    userhandler.getUserByMobile(req.body.mobileNumber).then(user => {
      if (!user) throw "No data found";
      user.password = "";
      return res.json(user);
    });
  } catch(error) {
    logger.error(error);
    return res.status(403).json({success: false, msg: 'Authentication failed.'});
  }
});

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}

router.post('/createuser', function (req, res) {

    async.waterfall([
      function(callback){
          userhandler.getUserByMobile(req.body.mobileNumber).then(user => {
            console.log(user);
              callback(null, user);
          }).catch(err => {
              callback(null, null);
          })
      },
      // checks if user exist and deletes if old enough and unconfirmed
      function(user, callback){
          if (user) {
            console.log("User found. " + user)
            var now = new Date();
              console.log("removing user");
              userhandler.deleteUnconfirmed(user.mobileNumber).then(function() {
                callback(null, null, null);
              })
          } else {
            // if no user found continue
            console.log("No user found");
            callback(null, null, null);
          }
      },
      // creates the user
      function(data, data2, callback){
        userhandler.createUser(req.body.mobileNumber, req.body.alias, req.body.email, req.body.password, req.body.pushtoken).then(savedUser => {
    //      useridentificationhandler.createIdentification(savedUser._id, req.body.identificationjson).then(savedIdentification => {
            var generatedCode = randomGenerator.generateCode(5, "1234567890");
            // TODO: set code and save before send sms
            smshandler.sendSmsNew(savedUser.mobileNumber, generatedCode).then(code => {
              userhandler.setCode(savedUser._id, generatedCode).then(updatedUser => {
                // TODO: send on events, event sourceing
                callback(null, updatedUser);

              }).catch(error => {
                logger.error(error);
    //            savedIdentification.remove();
                savedUser.remove();
                throw 'Could set control code';
              });
            }).catch(error => {
              logger.error(error);
    //          savedIdentification.remove();
              savedUser.remove();
              throw "Could not send code";
            });
    //      }).catch(error => {
    //        logger.error(error);
    //        savedUser.remove();
    //        throw "Could not create identification";
    //      });
        }).catch(function(error) {
          console.log(error);
          logger.error(error);
          return res.status(500).json({success: false, msg: 'Could not create user. Contact support'});
        });
      },
    ], function (err,result) {
        if (err) {
          console.log(err)
          return res.status(500).json({success: false, msg: 'Could not create user. Contact support'});
        }
        console.log(result)
        return res.json({success: true, userid: result._id, msg: "pending code"});
    });
});

router.post('/updatepassword', checkauthentication, function (req, res) {
  logger.info("updatepassword" , req.body);
  // TODO: This might not be secure enought, make some kind of state for it
  userhandler.updatePassword(req.body.owner_id, req.body.currentpassword, req.body.newpassword).then(updatedUser => {
    return res.json({success: true, userid: updatedUser._id});
  }).catch(error => {
    logger.error(error);
    return res.status(500).json({success: false, msg: 'Could not update user. Contact support'});
  });
});

router.post('/confirmsignupcode', function (req, res) {
  logger.info("confirmsignupcode" , req.body);
  console.log("confirmsignupcode" , req.body);
  // sms send kode, store code
  // TODO: any extra security, maybe password again?
  userhandler.confirmCode(req.body.owner_id, req.body.confirmCode).then(updatedUser => {
  logger.info("confirmCode" , req.body);
    return res.json({success: true, userid: updatedUser._id});
  }).catch(error => {
    logger.error(error);
    return res.status(500).json({success: false, msg: 'Could not update user. Contact support'});
  })
});

router.post('/resendcode', function (req, res) {
  logger.info("resendcode" , req.body);
  console.log("resendcode" , req.body);
  if (!req.body.owner_id) throw "No owner id";
  //TODO: security here? - User can continiously ask for sms
  userhandler.getUser(req.body.owner_id).then(user => {
    console.log("Find user with id :" + req.body.owner_id);
    console.log("User mobile is :" + user.mobileNumber);
    var generatedCode = randomGenerator.generateCode(5, "1234567890");
    smshandler.sendSmsNew(user.mobileNumber, generatedCode).then(code => {
      userhandler.setCode(req.body.owner_id, generatedCode).then(updatedUser => {
        return res.json({success: true, userid: updatedUser._id, msg: "pending code"});
      }).catch(error => {
        logger.error(error);
        updatedUser.remove();
        return res.json({success: false, msg: "Could not set control code"});
      });
    }).catch(error => {
      logger.error(error);
      updatedUser.remove();
      return res.json({success: false, msg: "Could not send code"});
    });
  }).catch(error => {
      logger.error(error);
      return res.json({success: false, msg: "Could not find user"});
  });
});

router.post('/confirmloginmobile', function (req, res) {
  logger.info("confirmloginmobile" , req.body);
  if (!req.body.mobileNumber) throw "No mobile provided";
  userhandler.getUserByMobile(req.body.mobileNumber).then(user => {
    logger.debug("User id :" + user._id);
    var generatedCode = randomGenerator.generateCode(5, "1234567890");
    smshandler.sendSmsNew(req.body.mobileNumber, generatedCode).then(code => {
      userhandler.setCode(user._id, generatedCode).then(updatedUser => {
        logger.info("Reactivating user " + req.body.owner_id + " with code " + generatedCode);
        return res.json({success: true, userid: updatedUser._id, msg: "pending code"});
      }).catch(error => {
        logger.error(error);
        updatedUser.remove();
        return res.json({success: false, msg: "Could not set control code"});
      });
    }).catch(error => {
      logger.error(error);
      updatedUser.remove();
      return res.json({success: false, msg: "Could not send code"});
    });
  }).catch(error => {
      logger.error(error);
      return res.json({success: false, msg: "Could not find user"});
  });
});

router.post('/forgotpassword', function (req, res) {
  logger.info("forgotpassword" , req.body);
  console.log("forgotpassword" , req.body);
  if (!req.body.mobileNumber) throw "No mobile provided";
  userhandler.getUserByMobile(req.body.mobileNumber).then(user => {
    logger.debug("User : " + JSON.stringify(user));
    console.log("User " , JSON.stringify(user._id));
    emailhandler.generateUrlWithToken(user._id).then(url => {
      emailhandler.sendEmail(req, user.email, url).then(response => {
        logger.debug("Response : " + JSON.stringify(response));
        console.log("Response " , JSON.stringify(response));
        return res.json({success: true, msg: "Email sent"});
      }).catch(error => {
        logger.error(error);
        return res.json({success: false, msg: "Could not send email"});
      });
    }).catch(error => {
      logger.error(error);
      return res.json({success: false, msg: "Could not generate URL"});
    });
  }).catch(error => {
    logger.error(error);
    return res.json({success: false, msg: "Could not find user"});
  });
});

router.get('/resetpassword/:token', function (req, res) {
  logger.info("GET resetpassword" , req.body);
  console.log("GET resetpassword" , req.body);
  if (!req.params.token) throw "No token id";
  emailhandler.isTokenValid(req.params.token).then(result => {
    console.log("Result: " , result);
    if (result) {
      return res.sendFile(__dirname +'/html/resetpassword.html');
    } else {
      return res.sendFile(__dirname +'/html/error.html');
    }
  }).catch(error => {
    logger.error(error);
    console.log("RESULT error : " , error);
    return res.sendFile(__dirname +'/html/error.html');
  });
})

router.post('/resetpassword/:token', function (req, res) {
  logger.info("POST resetpassword" , req);
  if (!req.params.token) throw "No token id";
  if (!req.body.password) throw "No password provided";
  emailhandler.isTokenValid(req.params.token).then(result => {
    if (result) {
      emailhandler.getUserForToken(req.params.token).then(userId => {
        console.log("Resetpassword to " + req.body.password + " for " + userId);
        userhandler.resetPassword(userId, req.body.password).then(updatedUser => {
        if (updatedUser) {
          return res.send("Your password has been changed correctly");
        }
      }).catch(error => {
          logger.error(error);
          return res.sendFile(__dirname +'/html/error.html');
      })
      }).catch(error => {
        logger.error(error);
        return res.sendFile(__dirname +'/html/error.html');
      })
    } else {
      return res.sendFile(__dirname +'/html/error.html');
    }
  }).catch(error => {
    logger.error(error);
    return res.sendFile(__dirname +'/html/error.html');
  })
})

router.post('/confirmlogincode', function (req, res) {
  logger.info("confirmlogincode" , req.body);
  userhandler.confirmLoginCode(req.body.owner_id, req.body.confirmCode).then(updatedUser => {
  logger.info("confirmLoginCode" , req.body);
    return res.json({success: true, userid: updatedUser._id});
  }).catch(error => {
    logger.error(error);
    return res.status(500).json({success: false, msg: 'Could not update user. Contact support'});
  })
});

router.post('/updatephone', checkauthentication, function (req, res) {
  logger.info("updatephone", req.body);
  userhandler.getUser(req.body.owner_id).then(currentUser => {
    logger.debug("Current user is " + JSON.stringify(currentUser));
    userhandler.updatePhone(req.body.owner_id, req.body.currentphone, req.body.newphone).then(updatedUser => {
      console.log("Updated user is " + JSON.stringify(updatedUser));
      var generatedCode = randomGenerator.generateCode(5, "1234567890");
      smshandler.sendSmsNew(updatedUser.mobileNumber, generatedCode).then(code => {
        userhandler.setCode(req.body.owner_id, code).then(updatedUser => {
          logger.debug("Updated user with new code is " + JSON.stringify(updatedUser));
          userhandler.createPhoneHistory(req.body.owner_id, req.body.currentphone, req.body.newphone).then(phoneHistory => {
            logger.info("Phone history created: " + JSON.stringify(phoneHistory));
            return res.json({success: true, userid: updatedUser._id, msg: "pending code"});
          }).catch(error => {
            logger.error(error);
            currentUser.save(function(err) {
              if (err) logger.error(err);
              logger.warn("Rolled back user failed");
            })
            return res.json({success: false, msg: 'Could not save user phone historyr. Contact support'});
          });
        }).catch(error => {
          logger.error(error);
          currentUser.save(function(err) {
            if (err) logger.error(err);
            logger.warn("Rolled back user failed");
          })
          return res.json({success: false, msg: 'Could not set code on user. Contact support'});
        });
      }).catch(error => {
        logger.error(error);
        currentUser.save(function(err) {
          if (err) logger.error(err);
          logger.warn("Rolled back user failed");
        });
        return res.json({success: false, msg: 'Could not send code. Contact support'});
      })
    }).catch(error => {
      logger.error(error);
      return res.json({success: false, msg: 'Could not update user. Contact support'});
    })
  }).catch(error => {
    logger.error(error);
    return res.json({success: false, msg: 'Could not find user. Contact support'});
  })
});

router.get('/getprofile', checkauthentication, function (req, res) {
  logger.debug("getprofile", req.body);
  profilehandler.getProfile(req.body.owner_id).then(profile => {
    if (!profile) return res.status(404).json({success: false, msg: 'No profile data found.'});
    return res.json(profile);
  }).catch(error => {
    logger.error(error);
    return res.status(404).json({success: false, msg: 'No profile data found.'});
  });
});


// this might maybe be ruled out, current createuser demands profile
router.post('/createprofile', checkauthentication, function (req, res) {
  logger.debug("createprofile", req.body);
  profilehandler.createProfile(req.body.owner_id, req.body.profileJson).then(savedProfile => {
    return res.json({success: true, profileid: savedProfile._id});
  }).catch(error => {
    logger.error(error);
    return res.json({success: false, msg: 'Could not create profile. Contact support'});
  });
});


function getLoginAttempt(user) {
  return new Promise(
    function(resolve , reject) {
      //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
          //var tokenredis = redisClient(serverAddress.port, serverAddress.address);t
          var  tokenredis = redisClient(6378, 'userandaccountredis');
          tokenredis.get(redisprefixes.logintries + user._id.toString(), function(err, reply) {
            resolve(reply);
          })
    //  })
    })
}

function putLoginAttempt(user, prevattempt) {
  var now = new Date();
  var obj = JSON.parse(prevattempt);
  var attempt = {
    mobileNumber: user.mobileNumber,
    attempt: obj === null ?  1 : obj.attempt + 1,
    time: now
  }

  //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
      //var tokenredis = redisClient(serverAddress.port, serverAddress.address);
      var  tokenredis = redisClient(6378, 'userandaccountredis');
      tokenredis.set(redisprefixes.logintries + user._id.toString(), JSON.stringify(attempt), function () {
        return;
      });
  //})
}

function isBlocking(attempt, now) {
  if (!attempt) {
    return false;
  } else if (isNaN((new Date) - new Date(attempt.time)))  {
    return true;
  } else if  (attempt.attempt < 3) {
    console.log("Blocking 1 to 3")
    return ((new Date) - new Date(attempt.time)) < config.loginAttempt1;
  } else if (attempt.attempt >= 3 && attempt.attempt < 5) {
    console.log("Blocking 3 to 5")
    return ((new Date) - new Date(attempt.time)) < config.loginAttempt3;
  } else {
    console.log("Blocking 5 and over")
    console.log(config.loginAttempt5)
    console.log(((new Date) - new Date(attempt.time)))
    return ((new Date) - new Date(attempt.time)) < config.loginAttempt5;
  }
}

function clearLoginAttempts(user) {
  //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
      //var tokenredis = redisClient(serverAddress.port, serverAddress.address);
      var  tokenredis = redisClient(6379, 'userandaccountredis');
      tokenredis.del(redisprefixes.logintries + user._id.toString());
  //})
}



router.post('/login', function (req, res) {
  console.log("login " , req.body);

  try {

    if (!req.body.mobileNumber) throw "No mobile nr";
    if (!req.body.password) throw "No password given";

    if (!req.body.pushToken) logger.warn("No push token, investigate!");

    userhandler.getUserByMobile(req.body.mobileNumber).then(user => {
        if (!user) throw "User not found";
        if (user.status !== 'active') throw "User not active";

          user.comparePassword(req.body.password, function (err, isMatch) {
            getLoginAttempt(user).then(preattempt => {

                if (isBlocking(JSON.parse(preattempt), new Date())) {
                  console.log("preattempt is Blocking")
                  putLoginAttempt(user, preattempt);
                  return res.status(401).json({success: false, msg: 'Authentication failed.'});
                } else if (isMatch) {
                  clearLoginAttempts(user);
                }

               if (!isMatch) {
                 putLoginAttempt(user, preattempt);
                 return res.status(401).json({success: false, msg: 'Authentication failed.'});
               }

               var token = jwt.encode(user, config.secret);
               var now = new Date();
               var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
               utc.setMinutes(utc.getMinutes() + config.tokenExpiryMinutes);
               //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
                 //var tokenredis = redisClient(serverAddress.port, serverAddress.address);
                 var  tokenredis = redisClient(6379, 'userandaccountredis');
                 tokenredis.set(redisprefixes.token + user._id.toString(), utc.getTime());
                 if (req.body.pushToken) {
                   user.pushToken = req.body.pushToken;
                   user.save(function(err, savedUser) {
                     if (err) logger.error(err);
                     return res.json({success: true, token: token, userid: user._id , mobilenumber: user.mobileNumber, msg:"User authenticated"});
                   });
                 } else {
                    return res.json({success: true, token: token, userid: user._id, mobilenumber: user.mobileNumber, msg:"User authenticated"});
                 }
              /* }).catch(error => {
                 throw "Could not look up service " + error;
               });*/
          });
        });
    });

  } catch(error) {
    console.log("Error occured " + error)
    logger.error("Error occured " + error)
    return res.status(401).json({success: false, msg: 'Authentication failed.'});
  }
});

/** AUTHENTICATION CODE, works with authentication service **/

router.get('/loggedin', function (req, res) {

  // this writes info about the request and certificates
  //console.log(new Date()+' '+
  //      req.connection.remoteAddress+' '+
  //      req.socket.getPeerCertificate() +' '+
  //      req.method+' '+req.url);

  console.log("loggedin" , req.body);
  console.log("loggedin headers" , req.headers);
  var token = getToken(req.headers);
  try {
    if (!token) throw "No token supplied in loggedin";
    var decoded = jwt.decode(token, config.secret);
    if (!decoded) throw "Could not decode user";
    //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
      //var tokenredis = redisClient(serverAddress.port, serverAddress.address);
      var  tokenredis = redisClient(6379, 'userandaccountredis');
      tokenredis.get(redisprefixes.token + decoded._id.toString(), function(err, reply) {
        if (err || !reply) {
          console.log(err);
          console.log(reply);
          return res.status(401).json({success: false, msg: 'Authentication failed.'});
        }


        /**
        * Check if token is expired
        */
        var now = new Date();
        var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

        var expiryDate = new Date();
        expiryDate.setTime(reply);
        console.log("expires: " + expiryDate);
        console.log("utc    : " + utc);
        console.log("expired: " + (expiryDate < utc));

        if (expiryDate < utc) {
          return res.status(401).json({success: false, msg: 'Authentication expired.'});
        } else {
          var now = new Date();
          var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
          utc.setMinutes(utc.getMinutes() + 1);
          tokenredis.set(redisprefixes.token + decoded._id.toString(), utc.getTime());
        }

        userhandler.getUser(decoded._id).then(user => {
          if (!user) throw "No user found";
          if (user.status !== 'active') throw "User not active";
          return res.json({success: true, msg: 'Authenticated.'});
        }).catch(error => {
          logger.error(error);
          throw error;
        });
      });
    //});

  } catch(error) {
    console.log("Error occured " + error);
    logger.error("Error occured " + error)
    return res.status(401).json({success: false, msg: 'Authentication failed.'});
  }
});

function getToken(headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

/**
 * Method checks if request is authenticated
 */
function checkauthentication(req, res, next) {
 logger.info("Checkauth method start");
 if (process.env.NODE_ENV === "user_test") {
   console.log ("Using MOCK checkauthentication for testing");
   return next();
 } else {
 // the name of the service is registered by port if more than one port is defined
 // this meens that running the debugger will change the name of the service
 //serviceLookupHandler.serviceLookup("authenticationservice-8080", 'authenticated').then(serverAddress => {
   var server = process.env.DNSDOMAIN;
   request({
       url: 'https://' + server + '/authenticated', //URL to hit
       //url: "https://"+ serverAddress.address + ":" + serverAddress.port + "/" + serverAddress.routePath , //URL to hit
       qs: {time: +new Date()}, //Query string data
       method: 'GET',
       headers: {
         'host': req.headers.host,
         'servicename': config.serviceName,
         'authorization': req.headers.authorization
       },
       key: fs.readFileSync('/certs/chain.key'),
       cert: fs.readFileSync('/certs/chain.crt')
   }, function(error, response, body){
       if(error) {
         logger.error(error);
         return next(error);
       } else {
         var jsonObject = JSON.parse(body);
         if (jsonObject.success) {
           console.log("Here we have jsonObject in checkauth ", jsonObject)
          //  return next(jsonObject.msg);
           return next();
         } else {
           return res.status(401).json({success: false, msg: 'Authentication failed.'});
         }
       }
   });
 /*}).catch(err => {
   console.log(err)
   return res.status(401).json({success: false, msg: 'Authentication failed.'});
 })*/
 }
};


// Account routes
//NOTE Commented out for testing. Createaccount is made to decode a token. Use the method below if using postman for raw user id input
// router.post('/createaccount', function(req,res){
//   logger.info("create account: " + JSON.stringify(req.body));
//   accounthandler.createAccount(req.body.user_id, req.body.blockchainContractAddress, req.body.blockchainAccountCredentials, req.body.blockchainAccountAddress).then(savedAccount => {
//     return res.json({success: true, msg: "Link created", AccountId:savedAccount.id, blockchainContractAddress:savedAccount.blockchainContractAddress, blockchainAccountAddress: blockchainAccountAddress, blockchainAccountCredentials:savedAccount.blockchainAccountCredentials})
//   }).catch(error => {
//     logger.error(error)
//     return res.json({success: false, error:error})
//   });
// });

router.post('/createaccount', function(req,res){
  logger.info("create account: " + JSON.stringify(req.body));
  var token = getToken(req.headers);
  var decoded = jwt.decode(token, config.secret);
  console.log("DECODDED ID DUDE: ",decoded)
  accounthandler.createAccount(decoded._id, req.body.blockchainAccountAddress, req.body.blockchainAccountCredentials).then(savedAccount => {
    return res.json({success: true, msg: "Link created", AccountId:savedAccount.id, blockchainAccountAddress:savedAccount.blockchainAccountAddress, blockchainAccountCredentials:savedAccount.blockchainAccountCredentials})
  }).catch(error => {
    logger.error(error)
    return res.json({success: false, error:error})
  });
});

// TODO Create test
router.post('/addcontractaddress', function(req,res){
  logger.info("add contract address: " + JSON.stringify(req.body));
  var token = getToken(req.headers);
  var decoded = jwt.decode(token, config.secret);
  console.log("decoded: ", decoded._id)
  console.log("blockchaincontractaddress to link : ", req.body.blockchainContractAddress)
  accounthandler.addContractAddress(decoded._id, req.body.blockchainContractAddress).then(savedAccount => {
    return res.json({success: true, msg: "Link created", AccountId:savedAccount.id, blockchainContractAddress:savedAccount.blockchainContractAddress, blockchainAccountCredentials:savedAccount.blockchainAccountCredentials})
  }).catch(error => {
    logger.error(error)
    return res.json({success: false, error:error})
  });
});


router.get('/getallaccounts', function(req,res){
  logger.info("query for all accounts: " + JSON.stringify(req.body))
  Account.find({}, function(error, accounts){
    if(error){
      logger.error(error)
      res.json(error)
    } else {
      res.json(accounts)
    }
  });
});

// TODO Create test
router.get('/getallaccountsforuserbyid/:userid', function(req,res){
  console.log("getallaccounts for user by id: ", req.params.userid)
  // logger.info("query all accounts for user: " + req.params.userid)
    Account.find({user_id: req.params.userid}, function(error, accounts){
      if(error){
        console.log("error: ",error)
        // logger.error(error)
        res.json(error)
      } else {
        console.log("accounts: ",accounts)
        res.json(accounts)
      }
    })
});
// TODO Create test
router.get('/getallaccountsforuserbytoken', function(req,res){
  logger.info("get all accounts for user by token: " + JSON.stringify(req.body));

  var token = getToken(req.headers);
  console.log("token to decode:",token)
  var decoded = jwt.decode(token, config.secret);
  console.log("DECODDED ID DUDE: ",decoded)
    Account.find({user_id: decoded._id}, function(error, accounts){
      if(error){
        console.log("err hit")
        logger.error(error)
        res.json(error)
      } else {
        console.log("Accounts for token queried: ", accounts)
        res.json(accounts)
      }
    })
});


module.exports = router;
