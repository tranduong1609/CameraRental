require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./src/models/booking');
const Camera = require('./src/models/camera');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const start_date = new Date('2026-05-14T00:00:00.000Z');
  const end_date = new Date('2026-05-15T00:00:00.000Z');

  const conflictAgg = await Booking.aggregate([
    {
      $match: {
        status: { $nin: ['cancelled', 'refunded', 'completed'] },
        start_date: { $lt: end_date },
        end_date: { $gt: start_date },
      }
    },
    { $group: { _id: '$camera_id', count: { $sum: 1 } } },
  ]);

  console.log('Date filtered bookings count:', conflictAgg);

  const fullyBookedIds = [];
  for (const agg of conflictAgg) {
    const cam = await Camera.findById(agg._id).select('quantity');
    console.log('Camera:', cam.name, 'Quantity:', cam.quantity, 'Conflicts:', agg.count);
    if (cam && agg.count >= (cam.quantity || 1)) {
      fullyBookedIds.push(agg._id);
    }
  }

  console.log('Fully booked IDs:', fullyBookedIds);

  const filter = {};
  if (fullyBookedIds.length > 0) {
    filter._id = { $nin: fullyBookedIds };
  }

  const availableCameras = await Camera.find(filter).select('name quantity');
  console.log('Available cameras count:', availableCameras.length);

  process.exit(0);
}

test();
