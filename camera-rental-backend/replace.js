const fs = require('fs');
let content = fs.readFileSync('seed.js', 'utf8');

const images = {
  mirrorless: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
  dslr: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80',
  film: 'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?w=800&q=80',
  lens: 'https://images.unsplash.com/photo-1617005082833-1eb5856b3b24?w=800&q=80',
  accessory: 'https://images.unsplash.com/photo-1589803028392-411a0bbbfefb?w=800&q=80'
};

let lines = content.split('\n');
let currentCategory = '';

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("category: 'mirrorless'")) currentCategory = 'mirrorless';
  else if (lines[i].includes("category: 'dslr'")) currentCategory = 'dslr';
  else if (lines[i].includes("category: 'film'")) currentCategory = 'film';
  else if (lines[i].includes("category: 'lens'")) currentCategory = 'lens';
  else if (lines[i].includes("category: 'accessory'")) currentCategory = 'accessory';
  
  if (lines[i].includes('images: []')) {
     lines[i] = lines[i].replace('images: []', `images: ['${images[currentCategory] || images.mirrorless}']`);
  }
}

fs.writeFileSync('seed.js', lines.join('\n'));
console.log('Successfully updated seed.js with mock images');
