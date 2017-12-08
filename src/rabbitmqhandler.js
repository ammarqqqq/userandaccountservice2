const servicebus = require('servicebus');
const retry = require('servicebus-retry');
const fs = require('fs');

var rabbitmqHandler = (function() {
  var deps = {};

  var singletonBus;

  function getConnection(url) {
    var connection = deps.getConnection(url);
    return connection;
  }

  deps.getConnection = function(url) {
    return new Promise(
      function(resolve , reject) {

        var bus;
        function connectmq() {

          if (singletonBus && singletonBus.initialized) resolve(singletonBus);

          var opts = {
            cert: fs.readFileSync('/certs/rabbit-client1.cert.pem'),      // client cert
            ca: fs.readFileSync('/certs/cacert.pem'),
            key: fs.readFileSync('/certs/rabbit-client1.key.pem'),        // client key
          };

          bus = servicebus.bus({
            url: url,
            prefetch: 10
          }, opts);

          bus.use(retry({
            store: new retry.MemoryStore()
          }));

          bus.on('error', function(errr) {
            console.log("Error on bus " + errr)
            //
            connectmq(url);
          })


          bus.on('channel.close', function() {

          })

          bus.on('channel.end', function() {

          })

          bus.on('channel.cancel', function() {

          })

          bus.on('cancel', function() {

          })

          bus.on('end', function() {

          })

          bus.on('close', function() {

          })

          bus.on('connection.close', function() {

          })

          bus.on('connected', function() {
            console.log("Connected to rabbitmq");
            resolve(bus);
          })

          bus.on('ready', function() {
            console.log("Connected to rabbitmq");
            singletonBus = bus;
            resolve(bus);
          })
        }

        connectmq(url);
     }
    );
  }

  return {
    "getConnection": getConnection,
    "deps": deps
  };
})();

module.exports = rabbitmqHandler;
