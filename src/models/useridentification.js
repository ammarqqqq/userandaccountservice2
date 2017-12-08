var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
//const redisClient = require('redis').createClient;
//const redis = redisClient(6379, 'userandaccountredis');
const historyhandler = require('../historyhandler.js');

var changes = [];

var userIdentificationSchema = new Schema({
  user_owner_id : { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'User'},
  scanData: { type: Object, required: true },
  verified: { type: Boolean },
  created_at: Date,
  updated_at: Date
});

userIdentificationSchema.pre('update', function (next) {
  this.updated_at =  new Date();
  next();
});

userIdentificationSchema.pre('save', function (next) {
    // track history
    changes = [];
    var document = this;
    if (!document.isNew) {
      document.modifiedPaths().forEach(function(path) {
        var oldValue = document._original[path];
        var newValue = document[path];
        changes.push({
            path: path,
            oldValue: oldValue,
            newValue: newValue,
            when: new Date()
          });
      });
    }

    return next();
});

userIdentificationSchema.pre('create', function (next) {
  this.created_at =  new Date();
  next();
});

userIdentificationSchema.post('init', function() {
  this._original = this.toObject();
});

userIdentificationSchema.post('update', function () {
  //redis.set(this._id.toString(), JSON.stringify(this), function () {
  //});
  historyhandler.sendHistory(this._id.toString(), JSON.stringify(this.getChanges()));
});

userIdentificationSchema.post('save', function () {
  //redis.set(this._id.toString(), JSON.stringify(this), function () {
  //});
  historyhandler.sendHistory(this._id.toString(), JSON.stringify(this.getChanges()));
});

userIdentificationSchema.methods.getChanges = function () {
  return changes;
};

var userIdentification = mongoose.model('UserIdentification', userIdentificationSchema);

module.exports = userIdentification;
