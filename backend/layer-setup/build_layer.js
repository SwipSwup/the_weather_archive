const axios = require('axios');
const tar = require('tar');
const lzma = require('lzma-native');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const URL = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';
const OUTPUT_ZIP = path.join(__dirname, '../ffmpeg-layer.zip');
const EXTRACT_DIR = path.join(__dirname, 'temp_extract_ffmpeg');

async function build() {
    console.log('Downloading and extracting FFmpeg...');

    // Ensure extract dir exists
    if (fs.existsSync(EXTRACT_DIR)) {
        fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(EXTRACT_DIR);

    const decompressor = lzma.createDecompressor();
    const downloadStream = await axios({
        url: URL,
        method: 'GET',
        responseType: 'stream'
    });

    // Extract to disk
    const extractor = tar.x({
        cwd: EXTRACT_DIR
    });

    downloadStream.data.pipe(decompressor).pipe(extractor);

    await new Promise((resolve, reject) => {
        extractor.on('close', resolve); // tar.x (node-tar) emits close/end
        extractor.on('finish', resolve); // sometimes finish
        downloadStream.data.on('error', reject);
        decompressor.on('error', reject);
        extractor.on('error', reject);
    });

    console.log('Extraction complete. Searching for binary...');

    // Find ffmpeg binary
    // It's likely in a subdirectory like 'ffmpeg-x.x.x-amd64-static'
    let ffmpegPath = null;

    function findFile(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                findFile(fullPath);
            } else if (file === 'ffmpeg') {
                ffmpegPath = fullPath;
            }
        }
    }

    findFile(EXTRACT_DIR);

    if (!ffmpegPath) {
        throw new Error("FFmpeg binary not found in extracted files");
    }

    console.log(`Found binary at: ${ffmpegPath}`);

    // Create zip
    console.log('Creating zip archive...');
    const output = fs.createWriteStream(OUTPUT_ZIP);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);

        // Add file with executable permissions (0o755)
        archive.file(ffmpegPath, { name: 'bin/ffmpeg', mode: 0o755 });
        archive.finalize();
    });

    console.log(`Layer zip created at: ${OUTPUT_ZIP} (${archive.pointer()} bytes)`);

    // Cleanup
    fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
}

build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
