const express = require('express');
const router = express.Router();
const request = require('request');
const logger = require('./logger.js');
//const serviceLookupHandler = require("./consulLookup.js");
const Config = require('./config'),
  config = new Config();
const fs = require('fs');
const crypto = require('crypto');
const redisClient = require('redis').createClient;
var redisprefixes = require('./redisprefixes');
const userhandler = require('./userhandler.js')

var emailhandler = (function() {
  var deps = {};

  deps.sendEmail = function(req, email, link) {
    console.log("Connecting to message service to send email to " + email);
    return new Promise(
      function(resolve , reject) {
        var server = process.env.DNSDOMAIN;
        //serviceLookupHandler.serviceLookup("messageservice-8080", 'sendemail').then(serverAddress => {

          request({
              url: 'https://' + server + '/sendemail', //URL to hit
              //url: "https://"+ serverAddress.address + ":" + serverAddress.port + "/" + serverAddress.routePath , //URL to hit
              port: 443,
              qs: {time: + new Date()}, //Query string data
              method: 'POST',
              json: {
                  email: email,
                  link: link
              },
              headers: {
                'host': req.headers.host,
                'servicename': config.serviceName
              },
              key: fs.readFileSync('/certs/chain.key'),
              cert: fs.readFileSync('/certs/chain.crt')
        }, function(error, response){
        if(error) {
          logger.error(error);
          reject(error);
        } else {
          resolve(response);
        }
    });
/*  }).catch(err => {
    console.log(err)
    reject(err);
  })*/
});}

  deps.generateUrlWithToken = function(userId) {
    console.log("generateUrlWithToken for user "+ userId);
    return new Promise(
      function(resolve , reject) {
        crypto.randomBytes(20, function(err, buf) {
          if (err) {
            console.log(error);
            reject(error);
          } else {
            var token = buf.toString('hex');
             var url = config.resetPasswordUrl + token;
             console.log("Reset password url for user " + userId + " is " + url);
             saveResetToken(userId, token).then(result => {
                console.log("saved token to reset password ");
                resolve(url);
             })
           }
         })
     })
  }

  deps.isTokenValid = function (token) {
    console.log("isTokenValid " + token);
    return new Promise(
      function(resolve , reject) {
        getResetToken(token).then(tokenStr => {
          var now = new Date();
          var nowMillis = now.getTime();
          console.log("Now millis: " + nowMillis);
          var tokenObj = JSON.parse(tokenStr);
          userhandler.getUser(tokenObj.userId).then(user => {
            var difference = nowMillis - tokenObj.time;
            var differenceMinutes = difference/60000
            console.log("Difference minutes: " + differenceMinutes);
            if ( differenceMinutes < config.resetTokenValidMinutes) {
              console.log("token " + token + " is valid ");
              resolve(true)
            } else {
              console.log("token " + token + " is NOT valid ");
              resolve(false);
            }
          })
       }).catch(err => {
          console.log(err);
          reject(err);
      })
    });
  }

  deps.getUserForToken = function (token) {
    console.log("getUserForToken " + token);
    return new Promise(
      function(resolve , reject) {
        getResetToken(token).then(tokenStr => {
          var tokenObj = JSON.parse(tokenStr);
          console.log("User is " + tokenObj.userId);
          resolve(tokenObj.userId);
        }).catch(err => {
          console.log(err);
          reject(err);
      })
    })
  }

  function saveResetToken(userId, token) {
    console.log("saveResetTokenToRedis "+ token);
    return new Promise(
      function(resolve , reject) {
        var now = new Date();
        var tokenObj = {
          userId: userId,
          time: now.getTime()
        }
        //TODO: check if there is already a token for the user
        //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
          //var tokenredis = redisClient(serverAddress.port, serverAddress.address);
          var tokenredis = redisClient(6378,'userandaccountredis');
          tokenredis.set(redisprefixes.resetpasswordtoken + token, JSON.stringify(tokenObj), function (err, reply) {
            console.log("SET REDIS: " + reply);
            resolve(reply);
          });
        //})
      })
  }

  function getResetToken(token) {
    console.log("getResetTokenFromRedis "+ token);
    return new Promise(
      function(resolve , reject) {
        //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
          //var tokenredis = redisClient(serverAddress.port, serverAddress.address);
          var tokenredis = redisClient(6378,'userandaccountredis');
          tokenredis.get(redisprefixes.resetpasswordtoken + token, function(err, reply) {
          console.log("GET REDIS: " + reply);
          if (reply) {
              console.log("Resolving " + reply);
              resolve(reply);
          } else {
            console.log("Rejecting " + reply);
            reject("No token");
          }
        })
    //  })
    })
  }

  function sendEmail(req, email, link) {
      return deps.sendEmail(req, email, link)
  }

  function generateUrlWithToken(userId) {
      return deps.generateUrlWithToken(userId)
  }

  function isTokenValid(token) {
    return deps.isTokenValid(token)
  }

  function getUserForToken(token) {
    return deps.getUserForToken(token)
  }

return {
  "sendEmail": sendEmail,
  "generateUrlWithToken": generateUrlWithToken,
  "isTokenValid": isTokenValid,
  "getUserForToken": getUserForToken,
  "deps": deps
};

})();

module.exports = emailhandler;
