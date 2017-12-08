var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
mongoose.Promise = global.Promise;
const redisClient = require('redis').createClient;
//const serviceLookupHandler = require("../consulLookup.js");
var redisprefixes = require('../redisprefixes');
// var rollback = require('mongoose-rollback');

const historyhandler = require('../historyhandler.js');

var changes = [];

var userSchema = new Schema({
  mobileNumber: { type: String, required: true, unique: true },
  alias: { type: String },
  email: { type: String },
  password: { type: String, required: true },
  pushToken: { type: String },
  confirmCode: { type: String },
  status: { type: String},
  created_at: Date,
  updated_at: Date
});

userSchema.pre('remove', function(next) {
    this.model('UserProfile').remove({ user_owner_id: this._id }, next);
    this.model('UserIdentification').remove({ user_owner_id: this._id }, next);
    this.model('PhoneHistory').remove({ user_owner_id: this._id }, next);
    this.model('Account').remove({ user_id: this._id }, next);
});

userSchema.pre('update', function (next) {
  this.updated_at =  new Date();
  next();
});

userSchema.pre('create', function (next) {
  this.created_at =  new Date();
  next();
});

userSchema.post('init', function() {
  this._original = this.toObject();
});

userSchema.pre('save', function (next) {
    var user = this;

    // track history
    changes = [];
    var document = this;
    if (!document.isNew) {
      document.modifiedPaths().forEach(function(path) {
        if (path === 'password') return; // do it for password after hash
        var oldValue = '';
        if (document._original !== undefined) {
            oldValue = document._original[path];
        }
        var newValue = '';
        if (document !== undefined) {
          newValue = document[path];
        }
        changes.push({
            path: path,
            oldValue: oldValue,
            newValue: newValue,
            when: new Date()
          });
      });
    }

    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, function (err, hash) {
                if (err) {
                    return next(err);
                }
                var oldValue = user.password;
                user.password = hash;
                this.updated_at =  new Date();
                if (!this.isNew) {
                  changes.push({
                      path: 'password',
                      oldValue: oldValue,
                      newValue: hash,
                      when: new Date()
                    });
                }

                next();
            });
        });
    } else {
        return next();
    }
});

userSchema.post('update', function () {
  //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
    //var redis = redisClient(serverAddress.port, serverAddress.address);
    var  redis = redisClient(6378, 'userandaccountredis');
    redis.set(redisprefixes.user + this._id.toString(), JSON.stringify(this), function () {
    });
  //});

  if (this.getChanges().length !== 0) {
    historyhandler.sendHistory(this._id.toString(), JSON.stringify(this.getChanges())).catch(error => {
      console.log("History error " + JSON.stringify(error));
    });
  }
});

userSchema.post('save', function () {
  //serviceLookupHandler.serviceLookup("userandaccountredis", '').then(serverAddress => {
    //var redis = redisClient(serverAddress.port, serverAddress.address);
    var  redis = redisClient(6379, 'userandaccountredis');
    redis.set(redisprefixes.user + this._id.toString(), JSON.stringify(this), function () {
    });
  //});
  if (this.getChanges().length !== 0) {
    historyhandler.sendHistory(this._id.toString(), JSON.stringify(this.getChanges())).catch(error => {
      console.log("History error " + JSON.stringify(error));
    });
  }

});

userSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

userSchema.methods.getChanges = function () {
  return changes;
};

//Conditions for test environment
// if(process.env.NODE_ENV === 'user_test'){
//   rollbackConfig = {
//     index: true,
//     conn: 'mongodb://localhost:27017/user_integration_test',
//     collectionName: 'users'
//   };
// } else {
//   rollbackConfig = {
//     index: true,
//     collectionName: 'users'
//   };
// }

// userSchema.plugin(rollback, rollbackConfig);

var User = mongoose.model('User', userSchema);


module.exports = User;
