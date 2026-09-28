const mongoose = require('mongoose');

const savedPhotoSchema = mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true, index: true },
    photo: { type: mongoose.Schema.Types.ObjectId, ref: 'Photo', required: true },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

savedPhotoSchema.index({ board: 1, photo: 1 }, { unique: true }); // no duplicate saves in the same board

const SavedPhoto = mongoose.model('SavedPhoto', savedPhotoSchema);
module.exports = SavedPhoto;
