require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  require('../src/models/camera');
  const Booking = require('../src/models/booking');
  const Camera = require('../src/models/camera');

  const cameras = await Camera.find().lean();
  if (cameras.length === 0) {
    console.log('No cameras');
    process.exit();
  }

  const bookings = await Booking.find();
  let count = 0;

  for (const b of bookings) {
    const camExists = cameras.some(c => c._id.toString() === b.camera_id?.toString());

    if (!camExists) {
      const randomCam = cameras[Math.floor(Math.random() * cameras.length)];
      b.camera_id = randomCam._id;
      b.camera_snapshot = { name: randomCam.name, brand: randomCam.brand };
      await b.save();
      count++;
    } else if (!b.camera_snapshot || !b.camera_snapshot.name) {
      const cam = cameras.find(c => c._id.toString() === b.camera_id?.toString());
      if (cam) {
        b.camera_snapshot = { name: cam.name, brand: cam.brand };
        await b.save();
        count++;
      }
    }
  }

  console.log('Fixed ' + count + ' bookings');
  process.exit();
});
