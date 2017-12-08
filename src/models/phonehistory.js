var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const historyhandler = require('../historyhandler.js');

var changes = [];

var phoneHistory = new Schema({
  user_owner_id : { type: Schema.Types.ObjectId, required: true, ref: 'User'},
  old_phone: { type: String },
  new_phone: { type: String },
  create_at: Number
});

phoneHistory.pre('save', function (next) {
  this.created_at = new Date().getTime();
  next();
});

phoneHistory.pre('save', function (next) {

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
  next();
});

var PhoneHistory = mongoose.model('PhoneHistory', phoneHistory);

module.exports = PhoneHistory;