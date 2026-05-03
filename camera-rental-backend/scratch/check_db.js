require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/booking');
const User = require('../src/models/user');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const users = await User.find().limit(5);
  console.log('Recent Users:', users.map(u => ({ id: u._id, email: u.email })));
  
  const bookings = await Booking.find().limit(5);
  console.log('Recent Bookings:', bookings.map(b => ({ id: b._id, user_id: b.user_id, email: b.customer_info?.email })));
  
  process.exit(0);
}

check();
