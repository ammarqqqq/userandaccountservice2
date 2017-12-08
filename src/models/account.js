var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const Config = require('../config'),
      config = new Config();

// var rollback = require('mongoose-rollback');

// TODO SCHEMA TO BE UPDATED. ADD KEY SECRET PAIR
var accountSchema = new Schema({
  user_id : { type: Schema.Types.ObjectId, required: true, ref: 'User'},
  blockchainAccountAddress: { type: String, required: true},
  blockchainAccountCredentials: { type: String, required: true},
  blockchainContractAddress: { type: String, default: ""},
  enabled: {type: Boolean, default: false } //enabled or disabled account
});

//rollback params

//Conditions for test environment
if(process.env.NODE_ENV === 'user_test'){
  rollbackConfig = {
    index: true,
    conn: 'mongodb://localhost:27017/user_integration_test',
    collectionName: 'accounts'
  };
} else {
  rollbackConfig = {
    index: true,
    collectionName: 'accounts'
  };
}

// accountSchema.plugin(rollback, rollbackConfig);

accountSchema.pre('update', function(next){
  this.updated_at = new Date().getTime();
  next()
});

accountSchema.pre('remove', function(next) {
    this.model('Iban').remove({ accountId: this._id }, next);
});

accountSchema.pre('save', function (next) {

  // track history
  changes = [];
  var document = this;
  console.log("document ",document)
  if (!document.isNew) {
    document.modifiedPaths().forEach(function(path) {
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
  next();
});

var Account = mongoose.model('Account', accountSchema);

module.exports = Account;
