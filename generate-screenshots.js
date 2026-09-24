import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');

// Create a simple screenshot with the theme color and application interface mockup
const generateScreenshot = async (width, height, label) => {
  try {
    // Create SVG mockup screenshot
    const svgImage = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1976d2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1565c0;stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- Header -->
        <rect width="${width}" height="${Math.floor(height * 0.12)}" fill="url(#grad1)"/>
        <text x="${width/2}" y="${Math.floor(height * 0.08)}" font-size="${Math.floor(height * 0.05)}" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial, sans-serif">St. Joseph Parish</text>
        
        <!-- Body content area -->
        <rect y="${Math.floor(height * 0.12)}" width="${width}" height="${Math.floor(height * 0.88)}" fill="#f5f5f5"/>
        
        <!-- Content boxes -->
        <rect x="${Math.floor(width * 0.05)}" y="${Math.floor(height * 0.18)}" width="${Math.floor(width * 0.9)}" height="${Math.floor(height * 0.15)}" fill="white" stroke="#ddd" stroke-width="1"/>
        <text x="${Math.floor(width * 0.08)}" y="${Math.floor(height * 0.26)}" font-size="${Math.floor(height * 0.04)}" fill="#333" font-family="Arial, sans-serif">Dashboard</text>
        
        <rect x="${Math.floor(width * 0.05)}" y="${Math.floor(height * 0.37)}" width="${Math.floor(width * 0.9)}" height="${Math.floor(height * 0.15)}" fill="white" stroke="#ddd" stroke-width="1"/>
        <text x="${Math.floor(width * 0.08)}" y="${Math.floor(height * 0.45)}" font-size="${Math.floor(height * 0.04)}" fill="#333" font-family="Arial, sans-serif">Records</text>
        
        <rect x="${Math.floor(width * 0.05)}" y="${Math.floor(height * 0.56)}" width="${Math.floor(width * 0.9)}" height="${Math.floor(height * 0.15)}" fill="white" stroke="#ddd" stroke-width="1"/>
        <text x="${Math.floor(width * 0.08)}" y="${Math.floor(height * 0.64)}" font-size="${Math.floor(height * 0.04)}" fill="#333" font-family="Arial, sans-serif">Finances</text>
        
        <rect x="${Math.floor(width * 0.05)}" y="${Math.floor(height * 0.75)}" width="${Math.floor(width * 0.9)}" height="${Math.floor(height * 0.15)}" fill="white" stroke="#ddd" stroke-width="1"/>
        <text x="${Math.floor(width * 0.08)}" y="${Math.floor(height * 0.83)}" font-size="${Math.floor(height * 0.04)}" fill="#333" font-family="Arial, sans-serif">Community</text>
      </svg>
    `;

    const buffer = Buffer.from(svgImage);
    const fileName = `screenshot-${label}.png`;
    const filePath = path.join(publicDir, fileName);

    await sharp(buffer)
      .png()
      .toFile(filePath);

    console.log(`✓ Generated ${fileName} (${width}x${height})`);
  } catch (error) {
    console.error(`✗ Error generating screenshot for ${width}x${height}:`, error.message);
  }
};

const main = async () => {
  console.log('Generating PWA screenshots...');
  
  try {
    // Generate screenshots for narrow (mobile) and wide (desktop) form factors
    // 540x720 for mobile (portrait)
    await generateScreenshot(540, 720, '540');
    
    // 1280x720 for desktop (landscape)
    await generateScreenshot(1280, 720, '1280');

    console.log('\n✓ All screenshots generated successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();
