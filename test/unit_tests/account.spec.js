process.env.NODE_ENV = 'user_test';

let mongoose = require('mongoose');

let chai = require('chai');
let expect = require('chai').expect;
let should = require('chai').should;
let assert = require('chai').assert;
let sinon = require('sinon');

// sinon.stub(require('../../src/consulLookup.js'), 'serviceLookup').returns(
//   new Promise(
//    function(resolve , reject) {
//      var reply = {
//        address: 'localhost',
//        port: 27017,
//        routePath: 'historytable'
//      }
//      resolve(reply)
//    }
//  )
// );



var request = require('request');
// var rp = require('request-promise');
// sinon.stub(require('../../src/messageQueue.js'), 'listen');

var Schema = mongoose.Schema;
let Account = require('../../src/models/account');
let AccountConfig = require('../../src/models/accountconfig');
let Iban = require('../../src/models/iban');
let server = require('../../src/server');

chai.use(require('chai-http'));

describe('Integration-test: Server, Accounts', () => {

  beforeEach((done) => { //Before each test we empty the database
    Account.remove({}, (err) => {
      AccountConfig.remove({}, (err) => {
        Iban.remove({}, (err) => {
          done();
        });
      });
    });
  });

  /*
  * Test the /GET info route
  */
  describe('/GET info', () => {
      it('it should send an info message', (done) => {
        chai.request(server)
        .get('/info')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          done();
        });
      });
  });

  /*
  * Test the /POST createaccount route
  */
  describe('/Post createaccount', () => {
      it('it should create/link a new account if id data is supplied', (done) => {
        chai.request(server)
            .post('/createaccount')
            .set('content-type', 'application/x-www-form-urlencoded')
            .set('authorization','JWT eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1OWMzYjY3NDU5OTA2YTAwMmQ3NGM0ODEiLCJtb2JpbGVOdW1iZXIiOiIxOTE0MzMwNzM1MCIsImFsaWFzIjoiMSIsImVtYWlsIjoiMUAxIiwicGFzc3dvcmQiOiIkMmEkMTAkWTdvdDNXT2lJbkdoU2gucDJaMGRvdUIxS0NBYTkuQWxneExta0lFZC5HL1Jnem8uTzFJdnUiLCJzdGF0dXMiOiJhY3RpdmUiLCJfX3YiOjAsImNvbmZpcm1Db2RlIjoiIiwiX3ZlcnNpb24iOjJ9.Q2ceSqcjy29l_IxT-PmH6qmec7YNstD50zv9oKSiavw')
            .send(
              {
                'blockchainAccountAddress': 'dummy_accountaddress',
                'blockchainAccountCredentials': 'password'
              }
            )
            .end(function(err, res) {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              expect(res).to.be.json;
              done();
            });
      });
  });

  /*
  * Test the /GET getallaccounts route
  */
  describe('/GET getallaccounts', () => {
      it('it should GET all accounts', (done) => {
        chai.request(server)
        .get('/getallaccounts')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          done();
        });
      });
  });

});
