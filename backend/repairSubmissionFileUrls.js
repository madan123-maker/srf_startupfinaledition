const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL)
  .then(async () => {
    console.log("Connected to MongoDB.");
    const submissionsCol = mongoose.connection.collection('submissions');
    const storedFilesCol = mongoose.connection.collection('storedfiles');

    const allStoredFiles = await storedFilesCol.find({}).toArray();
    console.log(`Total StoredFiles in DB: ${allStoredFiles.length}`);

    // Map by _id (as string) and by filename
    const idMap = new Map();
    const nameMap = new Map();

    for (const file of allStoredFiles) {
      idMap.set(file._id.toString(), file);
      if (!nameMap.has(file.filename)) {
        nameMap.set(file.filename, file);
      }
    }

    const submissions = await submissionsCol.find({}).toArray();
    let totalBroken = 0;
    let totalRepaired = 0;

    for (const sub of submissions) {
      let modified = false;
      if (!sub.responses) continue;

      for (const resp of sub.responses) {
        // 1. Field Responses
        if (resp.fieldResponses) {
          for (const fr of resp.fieldResponses) {
            if (fr.fileUrl && fr.fileUrl.startsWith('/uploads/')) {
              const fileId = fr.fileUrl.replace('/uploads/', '');
              if (!idMap.has(fileId)) {
                totalBroken++;
                console.log(`[BROKEN FR] Sub: ${sub._id} | Question: ${resp.questionId} | FileId: ${fileId} | Name: ${fr.fileName}`);
                if (fr.fileName && nameMap.has(fr.fileName)) {
                  const match = nameMap.get(fr.fileName);
                  fr.fileUrl = `/uploads/${match._id}`;
                  modified = true;
                  totalRepaired++;
                  console.log(`  -> Repaired to: /uploads/${match._id}`);
                }
              }
            }
          }
        }

        // 2. Supporting Document Responses
        if (resp.supportingDocumentResponses) {
          for (const sdr of resp.supportingDocumentResponses) {
            if (sdr.files) {
              for (const f of sdr.files) {
                if (f.fileUrl && f.fileUrl.startsWith('/uploads/')) {
                  const fileId = f.fileUrl.replace('/uploads/', '');
                  if (!idMap.has(fileId)) {
                    totalBroken++;
                    console.log(`[BROKEN SDR] Sub: ${sub._id} | Question: ${resp.questionId} | FileId: ${fileId} | Name: ${f.fileName}`);
                    if (f.fileName && nameMap.has(f.fileName)) {
                      const match = nameMap.get(f.fileName);
                      f.fileUrl = `/uploads/${match._id}`;
                      modified = true;
                      totalRepaired++;
                      console.log(`  -> Repaired to: /uploads/${match._id}`);
                    }
                  }
                }
              }
            }
          }
        }

        // 3. Additional Files
        if (resp.additionalFiles) {
          for (const af of resp.additionalFiles) {
            if (af.fileUrl && af.fileUrl.startsWith('/uploads/')) {
              const fileId = af.fileUrl.replace('/uploads/', '');
              if (!idMap.has(fileId)) {
                totalBroken++;
                console.log(`[BROKEN AF] Sub: ${sub._id} | Question: ${resp.questionId} | FileId: ${fileId} | Name: ${af.fileName}`);
                if (af.fileName && nameMap.has(af.fileName)) {
                  const match = nameMap.get(af.fileName);
                  af.fileUrl = `/uploads/${match._id}`;
                  modified = true;
                  totalRepaired++;
                  console.log(`  -> Repaired to: /uploads/${match._id}`);
                }
              }
            }
          }
        }
      }

      if (modified) {
        await submissionsCol.updateOne({ _id: sub._id }, { $set: { responses: sub.responses } });
        console.log(`Saved repaired submission ${sub._id}`);
      }
    }

    console.log(`\nSummary: Found ${totalBroken} broken fileUrl references. Repaired ${totalRepaired} using StoredFile filename matching.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
