const request = require('request');
//const serviceLookupHandler = require("./consulLookup.js");
const Config = require('./config'),
      config = new Config();
const fs = require('fs');

var historyhandler = (function() {
  var deps = {};

  function sendHistory(owner_id, history) {
    return deps.sendHistory(owner_id, history);
  }

  deps.sendHistory = function(owner_id, history) {
    return new Promise(
      function(resolve , reject) {
        var server = process.env.DNSDOMAIN;
        //serviceLookupHandler.serviceLookup("historyservice-8080", 'savehistory').then(serverAddress => {
          request({
              url: 'https://' + server + '/savehistory', //URL to hit
              //url: "https://"+ serverAddress.address + ":" + serverAddress.port + "/" + serverAddress.routePath , //URL to hit
              port: 443,
              qs: {time: +new Date()}, //Query string data
              method: 'POST',
              json: {
                owner_id: owner_id,
                historystring: history
              },
              headers: {
                'host': config.serviceName + ".monifair.com",
                'servicename': config.serviceName
              },
              key: fs.readFileSync('/certs/chain.key'),
              cert: fs.readFileSync('/certs/chain.crt')
          }, function(error, response, body){
              if(error) {
                reject(error);
              } else {
                if (body.success) {
                    resolve(body);
                } else {
                    reject(body.msg);
                }
              }
         });
      //  });


     }
    );
  }

  return {
    "sendHistory": sendHistory,
    "deps": deps
  };
})();

module.exports = historyhandler;
