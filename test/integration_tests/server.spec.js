//------------------------------------
//Integration tests for userservice
//Author: Jonathan Søyland-Lier
//Created: October 24. 2016
//Updated: -
//Updated by: -
//------------------------------------

//During the test the env variable is set to test
process.env.NODE_ENV = 'user_test';

let mongoose = require("mongoose");

//Require the dev-dependencies
let chai = require('chai');
let expect = require('chai').expect;
let should = require('chai').should;
let assert = require('chai').assert;
let sinon = require('sinon');

const smscode = "1234";

let redisprefixes = require("../../src/redisprefixes.js")
const Config = require("../../src/config.js")
  config = new Config();

let redis = require("fakeredis").createClient(6374, '127.0.0.1');
sinon.stub(require('redis'), 'createClient').returns(redis);

sinon.stub(require('../../src/smshandler.js'), 'sendSmsNew').returns(
   new Promise(
    function(resolve , reject) {
      resolve("1234")
    }
  )
);

sinon.stub(require('../../src/emailhandler.js'), 'sendEmail').returns(
   new Promise(
    function(resolve , reject) {
      resolve("true")
    }
  )
);

sinon.stub(require('../../src/randomgenerator.js'), 'generateCode').returns(
  "1234"
);

sinon.stub(require('../../src/consulLookup.js'), 'serviceLookup').returns(
  new Promise(
   function(resolve , reject) {
     var reply = {
       address: 'localhost',
       port: 27017,
       routePath: 'user_integration_test'
     }
     resolve(reply)
   }
 )
);

sinon.stub(require('../../src/historyhandler.js'), 'sendHistory').returns(
  new Promise(
   function(resolve , reject) {
     var reply = {
       address: 'localhost',
       port: 27017,
       routePath: 'user_integration_test'
     }
     resolve(reply)
   }
 )
);

sinon.stub(require('../../src/messageQueue.js'), 'listen');

let User = require('../../src/models/user');
let UserIdentification = require('../../src/models/useridentification');
let PhoneHistory = require('../../src/models/phonehistory');
let server = require('../../src/server');

chai.use(require('chai-http'));

//Our parent block
describe('Integration-test: Server, User', () => {

  before(() => {
    sinon.spy(redis, 'set');
  });

  after(() => {
    redis.set.restore();
  });

  beforeEach((done) => { //Before each test we empty the database
    User.remove({}, (err) => {
      PhoneHistory.remove({}, (err) => {
        done();
      });
    });
  });

  /*
  *Test if fake redis is running
  */
  describe('Fake redis', ()=> {
    it('should be called', () => {
      redis.set('FOO', 'BAR');
      expect(redis.set.called).to.equal(true);
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
  * Test the /POST createUser route
  */
  describe('/Post createuser', () => {
      it('it should POST create new user if id data is supplied', (done) => {
        chai.request(server)
            .post('/createuser')
            .set('content-type', 'application/x-www-form-urlencoded')
            .send(
              {
                'mobileNumber': '+4794055182',
                'alias' : 'TestUser',
                'email' : 'Test@email.com',
                'password': 'dummypassword',
                'pushToken': 'test'
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

  describe('/Post createuser', () => {
      it('it should get 500 when missing password', (done) => {
        chai.request(server)
            .post('/createuser')
            .set('content-type', 'application/x-www-form-urlencoded')
            .send({'mobileNumber': '+4794055182', 'pushToken': 'test'})
            .end(function(err, res) {
              expect(err).to.not.be.null;
              expect(res).to.have.status(500);
              expect(res).to.be.json;
              done();
            });
      });
  });

  /*
  * Test POST login route
  */
  describe('/Post login', () => {
      it('it should fail, no mobile/password', (done) => {
        chai.request(server)
            .post('/login')
            .end(function(err, res) {
              expect(err).to.be.not.null;
              expect(res).to.have.status(401);
              expect(res).to.be.json;
              done();
            });
      });
  });

  /*
  * Test POST loggedin route
  */
  describe('/Get loggedin', () => {
      it('it should fail, no token', (done) => {
        chai.request(server)
            .get('/loggedin')
            .end(function(err, res) {
              expect(err).to.be.not.null;
              expect(res).to.have.status(401);
              expect(res).to.be.json;
              done();
            });
      });
  });

  describe('/Post createuser', () => {
      it('it should POST create new user, confirm code, and log in', (done) => {
        chai.request(server)
            .post('/createuser')
            .set('content-type', 'application/x-www-form-urlencoded')
            .send(
              {
              'mobileNumber': '+4794055182',
              'alias' : 'TestUser',
              'email' : 'Test@email.com',
              'password': 'dummypassword',
              'pushToken': 'test'
              }
            )
            .end(function(err, res) {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              expect(res).to.be.json;

              chai.request(server)
                .post('/confirmsignupcode')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send(
                 {
                   "owner_id" : res.body.userid,
                   "confirmCode" : smscode
                 }
                ).end(function(err, res) {
                  expect(err).to.be.null;
                  expect(res).to.have.status(200);
                  expect(res).to.be.json;

                    chai.request(server)
                      .post('/login')
                      .send({'mobileNumber': '+4794055182', 'password': 'dummypassword'})
                      .end(function(err, res) {
                        expect(err).to.be.null;
                        expect(res).to.have.status(200);
                        expect(res).to.be.json;
                        console.log(res.body);
                        done();
                      });
                })
            });
      });
  });

  describe('/Post updatepassword', () => {
    it('it should POST updatepassword', (done) => {
      createTestUser('59807004fef396008fd3adb6', '4748603888', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .post('/updatepassword')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'owner_id': '59807004fef396008fd3adb6',
            'currentpassword': 'testpassword',
            'newpassword': 'newpassword'
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
  });

  describe('/Post updatepassword', () => {
    it('it should fail if wrong password', (done) => {
      createTestUser('59807004fef396008fd3adb6', '4748603887', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .post('/updatepassword')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'owner_id': '59807004fef396008fd3adb6',
            'currentpassword': 'wrongpassword',
            'newpassword': 'newpassword'
          }
        )
        .end(function(err, res) {
          expect(err).to.be.not.null;
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          done();
        });
      });
    });
  });

  describe('/Post updatephone', () => {
      it('it should POST updatephone', (done) => {
        createTestUser('59807004fef396008fd3adb6', '47486010203', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .post('/updatephone')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'owner_id': '59807004fef396008fd3adb6',
            'currentphone': '47486010203',
            'newphone': '47486010200'
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
  });

  describe('/Post updatephone', () => {
    it('it should fails if passed wrong phone number', (done) => {
      createTestUser('59807004fef396008fd3adb6', '47486010203', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .post('/updatephone')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'owner_id': '59807004fef396008fd3adb6',
            'currentphone': '47486010201',
            'newphone': '47486010202'
          }
        )
        .end(function(err, res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.have.property("success", false);
          done();
        });
      });
    });
  });

  describe('/Post resend code', () => {
    it('it should resend a new code ', (done) => {
      createTestUser('59807004fef396008fd3adb6', '47486010203', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .post('/resendcode')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'owner_id': '59807004fef396008fd3adb6',
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
  });

  describe('/Post resend code', () => {
    it('it should not resend a new code if the user does not exist', (done) => {
      createTestUser('59807004fef396008fd3adb6', '47486010203', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .post('/resendcode')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'owner_id': '59807004fef396008fd3adb0',
          }
        )
        .end(function(err, res) {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property("success", false);
          expect(res).to.be.json;
          done();
        });
      });
    });
  });

  describe('/Post createuser, confirm user and try log in several times to test blocking on failed attemts', () => {
    it('it should POST create new user if id data is supplied', (done) => {

      chai.request(server)
          .post('/createuser')
          .set('content-type', 'application/x-www-form-urlencoded')
          .send(
            {
            'mobileNumber': '+4794055182',
            'alias' : 'TestUser',
            'email' : 'Test@email.com',
            'password': 'dummypassword',
            'pushToken': 'test'
            }
          )
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.status(200);
            expect(res).to.be.json;

            var userid = res.body.userid;

            chai.request(server)
              .post('/confirmsignupcode')
              .set('content-type', 'application/x-www-form-urlencoded')
              .send(
               {
                 "owner_id" : res.body.userid,
                 "confirmCode" : smscode
               }
              ).end(function(err, res) {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res).to.be.json;

                  chai.request(server)
                    .post('/login')
                    .send({'mobileNumber': '+4794055182', 'password': 'wrongpassword'})
                    .end(function(err, res) {
                      //expect(err).to.not.be.null;
                      expect(res).to.have.status(401);
                      expect(res).to.be.json;

                      redis.get(redisprefixes.logintries + userid.toString(), function(err, reply) {
                        console.log("reply from cache in test is " + reply);
                        expect(reply).to.not.be.null;
                        assert.equal(JSON.parse(reply).attempt, 1);
                        redis.set(redisprefixes.logintries + userid.toString(), JSON.stringify({
                            mobileNumber: '+4794055182',
                            attempt: 3,
                            time: ((new Date) + new Date(config.loginAttempt3))
                        })
                      );
                        chai.request(server)
                          .post('/login')
                          .send({'mobileNumber': '+4794055182', 'password': 'wrongpassword'})
                          .end(function(err, res) {
                            //expect(err).to.not.be.null;
                            expect(res).to.have.status(401);
                            expect(res).to.be.json;


                            redis.get(redisprefixes.logintries + userid.toString(), function(err, reply) {
                              console.log("reply from cache in test is " + reply);
                              assert.equal(JSON.parse(reply).attempt, 4);

                              expect(reply).to.not.be.null;
                              chai.request(server)
                                .post('/login')
                                .send({'mobileNumber': '+4794055182', 'password': 'wrongpassword'})
                                .end(function(err, res) {
                                  //expect(err).to.not.be.null;
                                  expect(res).to.have.status(401);
                                  expect(res).to.be.json;

                                  redis.get(redisprefixes.logintries + userid.toString(), function(err, reply) {
                                    console.log("reply from cache in test is " + reply);
                                    expect(reply).to.not.be.null;

                                    assert.equal(JSON.parse(reply).attempt, 5);
                                      redis.set(redisprefixes.logintries + userid.toString(), JSON.stringify({
                                          mobileNumber: '+4794055182',
                                          attempt: 10,
                                          time: ((new Date) - new Date(60 * 1000 * 5))
                                      })
                                    );

                                      chai.request(server)
                                        .post('/login')
                                        .send({'mobileNumber': '+4794055182', 'password': 'dummypassword'})
                                        .end(function(err, res) {
                                          //expect(err).to.be.null;
                                          expect(res).to.have.status(200);
                                          //expect(res).to.be.json;
                                          done();
                                      })

                                  })
                              })
                            })
                        })
                      })
                  })
              })
          });
    });
 })


  describe('/Post confirm login code', () => {
    it('it should fail if the user is not active and the code is OK', (done) => {
      createTestUser('59807004fef396008fd3adb6', '47486010203', 'testpassword', 'active', '12345').then(result => {
        chai.request(server)
        .post('/confirmlogincode')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'owner_id': '59807004fef396008fd3adb6',
            'confirmCode': '11111'
          }
        )
        .end(function(err, res) {
          expect(err).to.be.not.null;
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          done();
        });
      });
    });
  });

  /*
  * Test the /POST createUser route
  */
  describe('/Post createuser and see if it is overwritten if same user not confirmed and created_at is over 15 min', () => {
      it('it should POST create new user if id data is supplied', (done) => {

        var sandbox = sinon.sandbox.create();

        chai.request(server)
            .post('/createuser')
            .set('content-type', 'application/x-www-form-urlencoded')
            .send(
              {
                'mobileNumber': '+4794055183',
                'alias' : 'TestUser2',
                'email' : 'Test@email2.com',
                'password': 'dummypassword2',
                'pushToken': 'test2'
              }
            )
            .end(function(err, res) {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              expect(res).to.be.json;

              sandbox.restore();

              sandbox.stub(require('../../src/userhandler.js'), 'getUserByMobile').returns(
                new Promise(
                 function(resolve , reject) {
                   var user = new User({
                     'mobileNumber': '+4794055183',
                     'alias' : 'TestUser2',
                     'email' : 'Test@email2.com',
                     'password': 'dummypassword2',
                     'pushToken': 'test2',
                     'status': "pending_confirmation",
                     'created_at': new Date(new Date().getTime())
                   });
                   resolve(user)
                 }
               )
              );

              // should be blocked and return 500
              chai.request(server)
                  .post('/createuser')
                  .set('content-type', 'application/x-www-form-urlencoded')
                  .send(
                    {
                      'mobileNumber': '+4794055183',
                      'alias' : 'TestUser2',
                      'email' : 'Test@email2.com',
                      'password': 'dummypassword2',
                      'pushToken': 'test2'
                    }
                  )
                  .end(function(err, res) {
                    expect(res).to.have.status(200);

                    sandbox.restore();


                    // the final call
                    chai.request(server)
                        .post('/createuser')
                        .set('content-type', 'application/x-www-form-urlencoded')
                        .send(
                          {
                            'mobileNumber': '+4794055183',
                            'alias' : 'TestUser2',
                            'email' : 'Test@email2.com',
                            'password': 'dummypassword2',
                            'pushToken': 'test2'
                          }
                        )
                        .end(function(err, res) {
                          expect(res).to.have.status(200);
                          done();
                        });
                  });
            });
      });
  });

  describe('/post forgotpassword', () => {
    it('it should send an email if passed valid phone number', (done) => {
      createTestUser('59807004fef396008fd3adb6', '47486010201', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .post('/forgotpassword')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'mobileNumber': '47486010201',
          }
        )
        .end(function(err, res) {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.have.property("success", true);
          done();
        });
      });
    });
  });

  describe('/get resetpassword', () => {
    it('it should return a page to reset the password if passed valid token', (done) => {
      var userId = '59807004fef396008fd3adb6';
      var token = 'fe2df1923643c3ec1372248949c5a7c0a7989947';
      redis.set(redisprefixes.resetpasswordtoken + token, JSON.stringify({
        mobileNumber: '47486010203',
        userId: userId,
        time: (new Date).getTime()
       })
      )
      createTestUser(userId, '47486010203', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .get('/resetpassword/' + token)
        .set('content-type', 'application/x-www-form-urlencoded')
        .end(function(err, res) {
          expect(res).to.have.status(200);
          expect(res).not.to.be.json;
          expect(res).to.be.html;
          expect(res.text).to.contain('New Password:');
          done();
        });
      });
    });
  });

  describe('/post resetpassword', () => {
    it('it should reset the password if passed valid token and password', (done) => {
      var userId = '59807004fef396008fd3adb6';
      var token = 'fe2df1923643c3ec1372248949c5a7c0a7989947';
      redis.set(redisprefixes.resetpasswordtoken + token, JSON.stringify({
        mobileNumber: '47486010203',
        userId: userId,
        time: (new Date).getTime()
       })
      )
      createTestUser('59807004fef396008fd3adb6', '47486010203', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .post('/resetpassword/' + token)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'password': 'NEW_PASSWORD',
          }
        )
        .end(function(err, res) {
          expect(res).to.have.status(200);
          expect(res).not.to.be.json;
          expect(res).to.be.html;
          expect(res.text).to.contain('Your password has been changed correctly');
          done();
        });
      });
    });
  });


  describe('/post resetpassword', () => {
    it('it should NOT reset the password if passed WRONG token', (done) => {
      var userId = '59807004fef396008fd3adb8';
      var token = 'fe2df1923643c3ec1372248949c5a7c0a7989948';
      redis.set(redisprefixes.resetpasswordtoken + token, JSON.stringify({
        mobileNumber: '47486010203',
        userId: userId,
        time: (new Date).getTime()
       })
      )
      createTestUser('59807004fef396008fd3adb8', '47486010203', 'testpassword', 'active', '').then(result => {
        chai.request(server)
        .post('/resetpassword/' + 'WRONG_TOKEN')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(
          {
            'password': 'NEW_PASSWORD',
          }
        )
        .end(function(err, res) {
          expect(res).to.have.status(200);
          expect(res).not.to.be.json;
          expect(res).to.be.html;
          expect(res.text).to.contain('There has been an error reseting your password.');
          done();
        });
      });
    });
  });

/////////// Utility methods

  function createTestUser(id, phoneNumber, password, status, code) {
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
            resolve();
          }
        });
      });
  };

});//End parent block
