const rabbitMQHandler = require('./rabbitmqhandler.js')
const User = require("./models/user")
const Useridentification = require('./models/useridentification');

const serviceLookupHandler = require("./consulLookup.js");
const logger = require('./logger.js')
const redisClient = require('redis').createClient;
module.exports.listen = function(){
rabbitMQHandler.getConnection(process.env.RABBITMQ_URL).then(bus =>{

  bus.listen('user.deleteall', { ack: true }, function(msg) {
    console.log("got message" + JSON.stringify(msg));
    msg.handle.ack();



    User.remove({}, (err) => {
      if (err) {
        console.log("could not remove User " + err)
      }

        //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
          //var userandaccountredis = redisClient(serverAddress.port, serverAddress.address);
          var userandaccountredis = redisClient(6378, 'userandaccountredis');
          userandaccountredis.flushdb( function (err, succeeded) {
            if(err){
              console.log("could not flush redis " + err);
              //msg.handle.reject();
            }

            bus.send("user.deleteall.reply", {
              data: 'deleted all users'
            }, {ack : true})

          });
        //});
    })
  })
})
}
