require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/booking');
const User = require('../src/models/user');
const Camera = require('../src/models/camera');

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  // Use the user tranduongcbbc@gmail.com
  const user = await User.findOne({ email: 'tranduongcbbc@gmail.com' });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  
  console.log(`Verifying for User: ${user.email} (ID: ${user._id})`);
  
  // Simulation of the new logic
  const filter = [
    { user_id: user._id }
  ];
  if (user.email) filter.push({ 'customer_info.email': user.email });
  if (user.phone) filter.push({ 'customer_info.phone': user.phone });

  const bookings = await Booking.find({ $or: filter })
    .populate('camera_id', 'name brand')
    .sort({ createdAt: -1 });

  console.log(`Found ${bookings.length} bookings.`);
  bookings.forEach(b => {
    console.log(`- ${b.booking_code}: status=${b.status}, camera=${b.camera_id?.name}, linked_user=${b.user_id}, info_email=${b.customer_info?.email}`);
  });
  
  process.exit(0);
}

verify();
