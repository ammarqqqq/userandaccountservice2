//------------------------------------
//Unit testing the user model
//Author: Jonathan Søyland-Lier
//Created: October 24. 2016
//Updated: -
//Updated by: -
//------------------------------------

//During the test the env variable is set to test
process.env.NODE_ENV = 'user_test';

let expect = require('chai').expect;
let sinon = require('sinon');
let mongoose = require("mongoose");
let User = require('../../src/models/user');
let UserHandler = require('../../src/userhandler');



describe('Unit-test: User model', () =>{

  beforeEach((done) => { //Before each test we empty the database
    User.remove({}, (err) => {
        done();
    });
  });

  it('Mobile should be invalid if mobile is empty', (done) => {
    var usr = new User();

        usr.validate(function(err) {
            expect(err.errors.mobileNumber).to.exist;
            done();
        });
  });

  it('Password should be invalid if password is empty', (done) => {
    var usr = new User();

        usr.validate(function(err) {
            expect(err.errors.password).to.exist;
            done();
        });
  });


  it('It should create a user with the given parameters', (done) => {
    const phonenr = "474888888";
    const alias = "TEST";
    const email = "test@test.com";
    const password = "TEST_PASSWORD";
    const pushToken = "TEST_PUSH";
    UserHandler.createUser (phonenr, alias, email, password, pushToken).then(user => {
      expect(user.mobileNumber).to.equal(phonenr);
      expect(user.alias).to.equal(alias);
      expect(user.email).to.equal(email);
      done();
    });
  });

  it('It should update user with confirm code', (done) => {
    const id = '5937dfdd6b5a98eb2c7b3add';
    createTestUser(id, '474888888', 'TEST_PASSWORD', '12345', 'pending_confirmation').then(result => {
      console.log("RSULT: "+ JSON.stringify(result));
      expect(result.confirmCode).to.equal('12345');
      UserHandler.confirmCode(id, '12345').then(user => {
        expect(user._id+"").to.equal(id);
        expect(user.confirmCode).to.equal('');
        done();
      });
    });
  });

  it('It should returns error if confirm code does not match', (done) => {

	const id = "5937dfdd6b5a98eb2c7b3add";
    const code = "12345";
    const phonenr = "474888888";
    const password = "TEST_PASSWORD";
    const wrongcode = "54321";
    const status = 'pending_confirmation'
    createTestUser(id, phonenr, password, code, status).then(result => {
      UserHandler.confirmCode(id, wrongcode).then(user => {
        done();
      }).catch(error => {
        expect(error).to.equal('Code does not match');
         done();
      });
    });
  });


  it('It should update user with new phone', (done) => {
    const id = "5937dfdd6b5a98eb2c7b3add";
    const phonenr = "474888888";
    const newphonenr = "474888811";

    createTestUser(id, phonenr, 'TEST_PASSWORD', '12345', 'active').then(result => {
      UserHandler.updatePhone(id, phonenr, newphonenr).then(user => {
        expect(user._id+"").to.equal(id);
        expect(user.mobileNumber).to.equal(newphonenr);
        done();
      });
    });
  });

  it('It should create users phone history', (done) => {
    const id = '5937dfdd6b5a98eb2c7b3add';
    const phonenr = '474888888';
    const newphonenr = '474888811';
    createTestUser(id, phonenr, 'TEST_PASSWORD', '12345', 'active').then(result => {
      UserHandler.createPhoneHistory (id, phonenr, newphonenr).then(phoneHistory => {
        expect(phoneHistory.user_owner_id+"").to.equal(id);

        expect(phoneHistory.old_phone).to.equal(phonenr);
        expect(phoneHistory.new_phone).to.equal(newphonenr);
        done();
      });
    });
  });


  it('It should update user with new password', (done) => {
	const id = '5937dfdd6b5a98eb2c7b3add';
    const password = 'TEST_PASSWORD';
    const newpassword = 'TEST_NEW_PASSWORD';
    createTestUser('5937dfdd6b5a98eb2c7b3add', '474888888', password, '12345', 'active').then(result => {
      UserHandler.updatePassword(id, password, newpassword).then(user => {
        expect(user._id+"").to.equal(id);
        expect(user.password).to.not.equal(result.password);
        done();
      });
    });
  });

/////////// Utility methods

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
});
