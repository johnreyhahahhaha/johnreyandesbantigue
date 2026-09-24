import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');

// Create a simple icon with the theme color and a simple design
const generateIcon = async (size, maskable = false) => {
  try {
    // Create SVG with gradient background
    const svgImage = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1976d2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1565c0;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#grad1)"/>
        ${!maskable ? `<circle cx="${size/2}" cy="${size/2}" r="${size * 0.3}" fill="white" opacity="0.9"/>` : ''}
        <text x="${size/2}" y="${size/2 + size*0.08}" font-size="${size * 0.25}" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial, sans-serif">SJ</text>
      </svg>
    `;

    const buffer = Buffer.from(svgImage);
    const fileName = `icon-${size}x${size}${maskable ? '-maskable' : ''}.png`;
    const filePath = path.join(publicDir, fileName);

    await sharp(buffer)
      .png()
      .toFile(filePath);

    console.log(`✓ Generated ${fileName}`);
  } catch (error) {
    console.error(`✗ Error generating icon for ${size}x${size}:`, error.message);
  }
};

const main = async () => {
  console.log('Generating PWA icons...');
  
  try {
    // Generate all required icon sizes
    const sizes = [96, 192, 512];
    
    // Generate regular icons
    for (const size of sizes) {
      await generateIcon(size, false);
    }
    
    // Generate maskable icons
    for (const size of [192, 512]) {
      await generateIcon(size, true);
    }

    console.log('\n✓ All icons generated successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();
