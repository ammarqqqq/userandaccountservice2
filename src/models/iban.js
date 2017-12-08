var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ibanSchema = new Schema({
  accountId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'Account' },
  iban: { type: String, unique: true, required: true },
  country: {type: String, required: true}
});

var Iban = mongoose.model('Iban', ibanSchema);

module.exports = Iban;
