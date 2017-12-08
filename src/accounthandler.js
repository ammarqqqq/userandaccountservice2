const logger = require('./logger.js')

const Account = require('./models/account.js');
const AccountConfig = require('./models/accountconfig.js');
const Iban = require('./models/iban.js');

// TODO
  // - Delete all accts for user
  // - create acct for user XXX
  // - get all accts
  // - delete all (NUKE SWITCH) XXX
  // - put routes in load balancer

var accountHandler = (function() {
  var deps = {};

  deps.createAccount = function(id, blockchainAccountAddress, blockchainAccountCredentials){
    return new Promise(
      function(resolve, reject) {
        var account = new Account({
          user_id: id,
          blockchainAccountAddress: blockchainAccountAddress,
          blockchainAccountCredentials: blockchainAccountCredentials,
          enabled: true
        });

        account.save(function(err, savedAccount){
          if (err) {
            console.log("error: " + err);
            reject(err)
          } else {
            console.log("saved account: " + savedAccount);
            resolve(savedAccount);
          }
        });
    });
  }

  // deps.deleteAllForUser = function(id){
  //     Accounts.remove({user_id: id}, function(err){
  //       if(err){
  //         console.log("err: " + err)
  //       } else {
  //         console.log("all entries tied to " + id + " has been removed")
  //       }
  //     })
  // }

  deps.deleteAllForUser = function(id){
    return new Promise(
    function(resolve, reject){
      Account.remove({user_id: id}, function(err, result){
        if(err){
          console.log("err: " + err)
          reject(err)
        } else {
          console.log("all entries tied to " + id + " has been removed")
          resolve(result)
        }
      })
    })
  }

  deps.addContractAddress = function(id, blockchainContractAddress){
    return new Promise(
      function(resolve, reject){
        Account.findOneAndUpdate({user_id: id}, {$set:{blockchainContractAddress: blockchainContractAddress}}, {new: true}, function(err, updatedAccount){
          if (err){
            console.log('error: ',err)
            reject(err)
          } else {
            resolve(updatedAccount)
          }
        })
    })
  }

  deps.getAccountIdByUserId = function(userid){
    return new Promise(
      function(resolve , reject) {
        console.log("userid: ",userid)
          Account.findOne({
              user_id: userid
          })
          .exec(function(err, account){
            console.log("account: ",account)
            if (err) {
              reject(err);
            } else {
              resolve(account._id);
            }
          });
        });
  }



  function createAccount(id , blockchainAccountAddress, blockchainAccountCredentials){
    return deps.createAccount(id, blockchainAccountAddress, blockchainAccountCredentials);
  }

  function addContractAddress(id, blockchainContractAddress){
    return deps.addContractAddress(id, blockchainContractAddress)
  }

  function deleteAllForUser(id){
    return deps.deleteAllForUser(id);
  }

  function getAccountIdByUserId(userid){
    return deps.getAccountIdByUserId(userid)
  }



  return {
    "createAccount": createAccount,
    "addContractAddress":addContractAddress,
    "deleteAllForUser": deleteAllForUser,
    "getAccountIdByUserId" : getAccountIdByUserId,
    "deps": deps
  };
})();

module.exports = accountHandler;
