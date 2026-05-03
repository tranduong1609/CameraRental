const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  gateway: {
    type: String,
    required: true,
  },
  transaction_date: {
    type: Date,
    default: null,
  },
  account_number: {
    type: String,
    default: null,
  },
  sub_account: {
    type: String,
    default: null,
  },
  amount_in: {
    type: Number,
    default: 0,
  },
  amount_out: {
    type: Number,
    default: 0,
  },
  accumulated: {
    type: Number,
    default: 0,
  },
  code: {
    type: String,
    default: null,
  },
  transaction_content: {
    type: String,
    default: null,
  },
  reference_number: {
    type: String,
    default: null,
  },
  body: {
    type: String,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'tb_transactions'
});

module.exports = mongoose.model('Transaction', transactionSchema);
