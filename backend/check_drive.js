require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'src/config/service-account.json'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function listFiles() {
  try {
    console.log('Folder ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);
    const result = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, createdTime, size)',
      orderBy: 'createdTime desc',
      pageSize: 20,
    });

    const files = result.data.files;
    if (files.length === 0) {
      console.log('\n⚠️  The folder is empty — no files have been uploaded yet.');
    } else {
      console.log(`\n✅ Found ${files.length} file(s) in Drive folder:\n`);
      files.forEach(f => {
        const size = f.size ? `${(parseInt(f.size) / (1024 * 1024)).toFixed(2)} MB` : 'N/A';
        console.log(`  📄 ${f.name}`);
        console.log(`     Type: ${f.mimeType}`);
        console.log(`     Size: ${size}`);
        console.log(`     Uploaded: ${new Date(f.createdTime).toLocaleString()}`);
        console.log(`     ID: ${f.id}`);
        console.log('');
      });
    }
  } catch (err) {
    console.error('❌ Error connecting to Drive:', err.message);
  }
}

listFiles();
