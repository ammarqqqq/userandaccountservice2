var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

var changes = [];

var profileSchema = new Schema({
  user_owner_id : { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'User'},
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  streetadress1: { type: String },
  streetadress2: { type: String },
  state: { type: String },
  postnumber: { type: String, required: true },
  country: { type: String, required: true },
  secret: { type: Boolean, default: false},
  created_at: Date,
  updated_at: Date
});

profileSchema.pre('update', function (next) {
  this.updated_at =  new Date();
  next();
});

profileSchema.pre('save', function (next) {
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

profileSchema.pre('create', function (next) {
  this.created_at =  new Date();
  next();
});

profileSchema.post('init', function() {
  this._original = this.toObject();
});

profileSchema.methods.getChanges = function () {
  return changes;
};

var profile = mongoose.model('UserProfile', profileSchema);

module.exports = profile;
