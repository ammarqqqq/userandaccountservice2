const express = require('express');
const backofficerouter = express.Router();
const jwt = require('jwt-simple');
const Config = require('./config'),
config = new Config();
const logger = require('./logger.js')
const smshandler =  require('./smshandler.js');
const request = require('request');
const randomGenerator = require("./randomgenerator.js");
const redisClient = require('redis').createClient;

const accountHandler = require('./accounthandler.js')
const userhandler = require('./userhandler.js');
const historyhandler = require('./historyhandler.js');
const profilehandler = require('./profilehandler.js');
const backofficeuserhandler = require('./backofficeuserhandler.js');
//const serviceLookupHandler = require("./consulLookup.js");

const Account = require('./models/account.js');
const AccountConfig = require('./models/accountconfig.js');
const Iban = require('./models/iban.js');
const User = require("./models/user")
const Useridentification = require('./models/useridentification');
var redisprefixes = require('./redisprefixes');


/**
 * @api {Post} /usertokenbyphonenr Receive users token.
 * @apiVersion 1.0.0
 * @apiName UserTokenbyPhonenr
 * @apiGroup Backoffice/userandaccountservice
 *
 * @apiBody {String} phonenr Users phonenr.
 *
 * @apiSuccess {Object}  token Users token.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      token:"fkjdklfdjksdjfiojsov"
 *     }
 *
 * * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "No data found."
 *     }
 *
 */
backofficerouter.post('/usertokenbyphonenr', function (req, res) {
  logger.info("usertokenbyphonenr");
  logger.debug("usertokenbyphonenr" , req.body);
  logger.debug("headers" , req.headers);
  // TODO: can we get the returns under control?

  userhandler.getUser(req.body.phonenr).then(user => {
    if (!user) return res.status(401).json({success: false, msg: 'Authentication failed.'});

      // TODO: is sms code confirmed? // state machine?
      console.log(user);
    //if (user.status !== 'active') {
      //return res.status(401).json({success: false, msg: 'Authentication failed.'});
    //}
      var token = jwt.encode(user, config.secret);
      return res.json({success: true, token: token, msg:"User authenticated"});
  }).catch(error => {
    logger.error(error);
    return res.status(401).json({success: false, msg: 'Authentication failed.'});
  });
});

/**
 * @api {get} /getuser Get user.
 * @apiVersion 1.0.0
 * @apiName GetUser
 * @apiGroup Backoffice/userandaccountservice
 *
 * @apiHeader {String} access-key Users unique access-key.
 *
 * @apiSuccess {Object}  profile User profile information.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      User{
 *           phonenr: '+4794055182',
 *           password: 'dummypassword''
 *          }
 *     }
 *
 * * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "No data found."
 *     }
 *
 */
backofficerouter.get('/getuser', function (req, res) {
  logger.info("getuser" , req.body);
  var token = getToken(req.headers);
  if (!token) return res.status(403).json({success: false, msg: 'Authentication failed.'});
  var decoded = jwt.decode(token, config.secret);
  //TODO: implement refresh token funct
  userhandler.getUser(decoded.phone).then(user => {
    if (!user) return res.status(404).json({success: false, msg: 'No data found.'});
    user.passord = "";
    return res.json(user);
  }).catch(error => {
    logger.error(error);
    return res.status(404).json({success: false, msg: 'No data found.'});
  });
});

backofficerouter.get("/listallusers", function(req, res) {
  logger.info("listallusers", req.body);
  User.find({}, function(err, users) {
    if (err) {
      return res.json({success:false, error : err})
    }
    res.json({ "users" : users });
  });
});





// TODO remove in production
backofficerouter.get('/deleteall', function (req, res) {


  logger.info("deleteall" , req.body);
  User.remove({}, (err) => {
    Useridentification.remove({}, (err) => {
      //serviceLookupHandler.serviceLookup("microservices_userandaccountredis", '').then(serverAddress =>
        //microservices_userandaccountredis = redisClient(serverAddress.port, serverAddress.address);
        microservices_userandaccountredis = redisClient(6379, 'microservices_userandaccountredis');
        microservices_userandaccountredis.flushdb( function (err, succeeded) {
            console.log(succeeded); // will be true if successfull
            return res.json({success: true});
        });
      //});
    });
  });
});


//TODO Should delete account service as well
backofficerouter.post("/deleteuser/:userid", function(req, res) {
  logger.info("deleteuser" , req.params);
  if(!req.params.userid) throw "No userId";
  User.findOneAndRemove({_id : req.params.userid}, (err, result) => {
    if (err) {
      logger.error(err)
      return res.json({success:false});
    } else if (!result){
      logger.warn("No user found")
      return res.json({success:true, msg:"No user found"})
    } else {
      Useridentification.remove({_id: result._id}, (err) => {
        //serviceLookupHandler.serviceLookup("microservices_userandaccountredis", '').then(serverAddress => {
          //microservices_userandaccountredis = redisClient(serverAddress.port, serverAddress.address);
         microservices_userandaccountredis.del(redisprefixes.token + result._id, function (err, succeeded) {
              var tokenredis = redisClient(6379, 'microservices_userandaccountredis');
              //var tokenredis = redisClient(serverAddress.port, serverAddress.address);
                console.log(succeeded); // will be true if successful
                return res.json({success:true, msg:"User: " + result.mobileNumber + " deleted"})
              });

      //})
      });
    }
  })
});

backofficerouter.get('/deleteuser/:mobileNumber', function (req, res) {
  logger.info("deleteuser" , req.params);
  console.log("deleteuser" , req.params);
  if (!req.params.mobileNumber) throw "No mobile number";
  User.findOneAndRemove({mobileNumber: req.params.mobileNumber}, (err, result) => {
    if (err) {
      logger.error(err);
      return res.json({success: false});
    } else if (!result) {
      logger.warn("No user found");
      return res.json({success: true});
    } else {
      Useridentification.remove({_id: result._id}, (err) => {
        //serviceLookupHandler.serviceLookup("microservices_userandaccountredis", '').then(serverAddress => {
          microservices_userandaccountredis = redisClient(6379, 'microservices_userandaccountredis');

          microservices_userandaccountredis.del(redisprefixes.token + result._id, function (err, succeeded) {
          var tokenredis = redisClient(6379, 'microservices_userandaccountredis');
          //var tokenredis = redisClient(serverAddress.port, serverAddress.address);
          console.log(succeeded); // will be true if successful
          return res.json({success:true, msg:"User: " + result.mobileNumber + " deleted"})
         });

      //})
    });
  }
});
});
/**
 * @api {get} /activateuserwithtoken Activate the user with it's token.
 * @apiVersion 1.0.0
 * @apiName ActivateUserWithToken
 * @apiGroup Backoffice/userandaccountservice
 *
 * @apiHeader {String} access-key Users unique access-key.
 *
 * @apiSuccess {Object}  profile User profile information.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      Success: true
 *      Msg: user activated
 *     }
 *
 * * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "No data found."
 *     }
 *
 */
backofficerouter.get('/activateuserwithtoken', function (req, res) {
  logger.info("activate user" , req.body);
  var token = getToken(req.headers);
  if (!token) return res.status(403).json({success: false, msg: 'Authentication failed.'});
  var decoded = jwt.decode(token, config.secret);
  //TODO: implement refresh token funct
  userhandler.getUser(decoded.phone).then(user => {
    if (!user) return res.status(404).json({success: false, msg: 'No data found.'});
    backofficeuserhandler.activateOrDeactivateUser(user.phone, true).then(activated =>{
      historyhandler.sendHistory(user._id, JSON.stringify("User activated by backoffice"));
      return res.json({success: true, msg: 'User activated.'});
    }).catch(error => {
      logger.error(error);
      return res.status(404).json({success: false, msg: 'No data found.'});
    });
  }).catch(error => {
    logger.error(error);
    return res.status(404).json({success: false, msg: 'No data found.'});
  });
});

/**
 * @api {get} /deactivateuserwithtoken Deactivate the user with it's token.
 * @apiVersion 1.0.0
 * @apiName DeactivateUserWithToken
 * @apiGroup Backoffice/userandaccountservice
 *
 * @apiHeader {String} access-key Users unique access-key.
 *
 * @apiSuccess {Object}  profile User profile information.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      Success: true
 *      Msg: user activated
 *     }
 *
 * * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "No data found."
 *     }
 *
 */
backofficerouter.get('/deactivateuserwithtoken', function (req, res) {
  logger.info("deactivate user" , req.body);
  var token = getToken(req.headers);
  if (!token) return res.status(403).json({success: false, msg: 'Authentication failed.'});
  var decoded = jwt.decode(token, config.secret);
  //TODO: implement refresh token funct
  userhandler.getUser(decoded.phone).then(user => {
    if (!user) return res.status(404).json({success: false, msg: 'No data found.'});
      backofficeuserhandler.activateOrDeactivateUser(user.phone, false).then(deactivated =>{
        historyhandler.sendHistory(user._id, JSON.stringify("User deativated by backoffice"));
        return res.json({success: true, msg: 'User deactivated.'});
      }).catch(error => {
      logger.error(error);
      return res.status(404).json({success: false, msg: 'No data found.'});
    });
  }).catch(error => {
    logger.error(error);
    return res.status(404).json({success: false, msg: 'No data found.'});
  });
});

/**
 * @api {get} /deleteuserwithtoken Delete the user with it's token.
 * @apiVersion 1.0.0
 * @apiName DeleteUserWithToken
 * @apiGroup Backoffice/userandaccountservice
 *
 * @apiHeader {String} access-key Users unique access-key.
 *
 * @apiSuccess {Object}  profile User profile information.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      Success: true
 *      Msg: user deleted
 *     }
 *
 * * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "No data found."
 *     }
 *
 */
backofficerouter.get('/deleteuserwithtoken', function (req, res) {
  logger.info("deactivate user" , req.body);
  var token = getToken(req.headers);
  if (!token) return res.status(403).json({success: false, msg: 'Authentication failed.'});
  var decoded = jwt.decode(token, config.secret);
  //TODO: implement refresh token funct
  userhandler.getUser(decoded.phone).then(user => {
    if (!user) return res.status(404).json({success: false, msg: 'No data found.'});
      backofficeuserhandler.deleteUser(user.phone).then(deleted =>{
        historyhandler.sendHistory(user._id, JSON.stringify("User deleted by backoffice"));
        return res.json({success: true, msg: 'User deleted.'});
      }).catch(error => {
      logger.error(error);
      return res.status(404).json({success: false, msg: 'No data found.'});
    });
  }).catch(error => {
    logger.error(error);
    return res.status(404).json({success: false, msg: 'No data found.'});
  });
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


/*
Account backoffice routes
*/

// TODO accountConfig commented out as no metadata is being created yet. Uncomment when content is created
backofficerouter.post('/deleteallforuser', function(req,res){
  logger.info("removing all for specified user_id "+JSON.stringify(req.body))
  accountHandler.getAccountIdByUserId(req.body.user_id).then(accountId => {
    Account.remove({user_id: req.body.user_id}, (error,docs) => {
      AccountConfig.remove({user_id: accountId}, (error,docs) => {
        Iban.remove({user_id: accountId}, (error, docs) =>{
          if(error){
            logger.info(error)
            res.json({success:false,error:error})
          } else {
            res.json({success:true,removeddocs:docs})
          }
        })
      })
    })
  }).catch(error => {
    res.json({success: false, error:error})
  })
});

/**
TODO Remove for production
**/
backofficerouter.get('/removeallaccounts', function(req,res){
  logger.info('Delete all accounts: ', req.body);
  Account.remove({}, (err) => {
    AccountConfig.remove({}, (err) => {
        Iban.remove({}, (err) => {
          if(err){
            return (res.json({success : false}));
          }
          return(res.json({success : true, msg:"All account, config, Iban removed"}));
        });
      });
  });
});

module.exports = backofficerouter;
