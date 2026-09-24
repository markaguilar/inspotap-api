import mongoose from 'mongoose';

const eventSchema = mongoose.Schema(
  {
    type: { type: String, enum: ['photo_view', 'hotspot_click', 'profile_view'], required: true },
    photo: { type: mongoose.Schema.Types.ObjectId, ref: 'Photo', default: null, index: true },
    hotspotId: { type: mongoose.Schema.Types.ObjectId, default: null },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
