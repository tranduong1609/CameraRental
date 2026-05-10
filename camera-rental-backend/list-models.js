const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

async function listModels() {
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const models = res.data.models.map(m => m.name);
    fs.writeFileSync('models.json', JSON.stringify(models, null, 2));
    console.log("Written to models.json");
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
listModels();
