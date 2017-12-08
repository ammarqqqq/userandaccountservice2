process.env.NODE_ENV = 'user_test';

let expect = require('chai').expect;
let sinon = require('sinon');
let mongoose = require("mongoose");
let User = require('../../src/models/user');
let Account = require('../../src/models/account');
let AccountConfig = require('../../src/models/accountconfig');
let Iban = require('../../src/models/iban');

describe('Unit-test: User model', () =>{

  beforeEach((done) => { //Before each test we empty the database
    User.remove({}, (err) => {
      done();
    });
  });

  describe('Cascade test for model', () => {

      it('it should cascade all ref models when remove', (done) => {
        const id = '5937dfdd6b5a98eb2c7b3aaa';
        createTestUser(id, '474888111', 'TEST_PASSWORD', '12345', 'pending_confirmation').then(savedUser => {
          createTestAccount(savedUser).then(savedAccount => {

            // expect one
            Account.findOne({
                user_id: id
            })
            .exec(function(err, account){
              expect(err).to.be.null;
              expect(account).not.to.be.null;

              savedUser.remove(function(err, deletedUser) {
                // expect none
                Account.findOne({
                    user_id: id
                })
                .exec(function(err, account){
                  expect(err).to.be.null;
                  expect(account).to.be.null;
                  done();
                });
              })
            });
          })
        });
      });
  });

  function createTestUser(id, phoneNumber, password, code, status) {
    return new Promise(
      function(resolve , reject) {
        var user = new User({
          '_id': new mongoose.mongo.ObjectId(id),
          'mobileNumber': phoneNumber,
          'alias': 'alias',
          'email': 'test.email.com',
          'password': password,
          'pushToken': 'pushToken',
          'status': status,
          'confirmCode': code
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
  };

  function createTestAccount(user) {
    return new Promise(
      function(resolve , reject) {

        var user_id = user._id;
        var blockchainAccountAddress = 'fv9jh2nv1nciq493fmsvi31';
        var blockchainAccountCredentials = 'f1g32v4g2y4tgbt4h5';

        var model = new Account({
          user_id: user_id,
          blockchainAccountAddress : blockchainAccountAddress,
          blockchainAccountCredentials : blockchainAccountCredentials
        });
        model.save(function(err, savedAccount) {
          if (err) reject(err);
          resolve(savedAccount);
        })
    })

  }

})
