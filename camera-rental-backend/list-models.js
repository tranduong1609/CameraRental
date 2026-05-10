const axios = require('axios');
require('dotenv').config();

async function listModels() {
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const models = res.data.models.map(m => m.name).filter(n => n.includes('gemini-3'));
    console.log("Available Gemini 3 models:", models);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
listModels();
