var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Will fill with meta data
var accountConfigSchema = new Schema({

  accountId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'Account' },

});

var AccountConfig = mongoose.model('AccountConfig', accountConfigSchema);

module.exports = AccountConfig;
