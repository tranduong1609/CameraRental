require('dotenv').config();
const mongoose = require('mongoose');
const Camera = require('../src/models/camera');
const Booking = require('../src/models/booking');

async function fixQuantity() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const cameras = await Camera.find({});
  console.log(`\nFound ${cameras.length} cameras\n`);

  for (const cam of cameras) {
    // Set default quantity if missing
    if (!cam.quantity || cam.quantity < 1) {
      cam.quantity = 1;
    }

    // Count active bookings for this camera
    const activeBookings = await Booking.countDocuments({
      camera_id: cam._id,
      status: { $nin: ['cancelled', 'refunded', 'completed'] },
    });

    // Calculate available quantity
    cam.available_quantity = Math.max(0, cam.quantity - activeBookings);

    // Update status
    if (cam.available_quantity === 0 && cam.status === 'available') {
      cam.status = 'rented';
    } else if (cam.available_quantity > 0 && cam.status === 'rented') {
      cam.status = 'available';
    }

    await cam.save();
    console.log(`${cam.name}: qty=${cam.quantity}, active_bookings=${activeBookings}, available=${cam.available_quantity}, status=${cam.status}`);
  }

  console.log('\nDone! All cameras updated.');
  await mongoose.disconnect();
}

fixQuantity().catch(err => {
  console.error(err);
  process.exit(1);
});
