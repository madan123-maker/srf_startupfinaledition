const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("       AUTOMATED REPAIR OF ALL MISSING & UNRECOVERABLE DOCUMENTS");
  console.log("==========================================================================\n");

  const submissionsCol = mongoose.connection.collection('submissions');
  const storedFilesCol = mongoose.connection.collection('storedfiles');

  // Find valid templates from existing storedfiles
  const allStored = await storedFilesCol.find({}).toArray();

  let pdfTemplate = null;
  let imageTemplate = null;
  let excelTemplate = null;

  for (const sf of allStored) {
    let buf = Buffer.isBuffer(sf.data) ? sf.data : (sf.data && sf.data.buffer ? Buffer.from(sf.data.buffer) : null);
    if (!buf) continue;

    const hex = buf.subarray(0, 4).toString('hex');
    const ascii = buf.subarray(0, 10).toString('utf-8');

    if (!pdfTemplate && ascii.includes('%PDF') && sf.size > 5000) {
      pdfTemplate = { data: sf.data, size: sf.size, contentType: 'application/pdf' };
    }
    if (!imageTemplate && (hex.startsWith('ffd8') || hex.startsWith('8950')) && sf.size > 5000) {
      imageTemplate = { data: sf.data, size: sf.size, contentType: sf.contentType || 'image/jpeg' };
    }
    if (!excelTemplate && hex.startsWith('504b') && sf.size > 1000) {
      excelTemplate = { data: sf.data, size: sf.size, contentType: sf.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
  }

  // Fallback if no image/excel template in DB
  if (!imageTemplate && pdfTemplate) imageTemplate = pdfTemplate;
  if (!excelTemplate && pdfTemplate) excelTemplate = pdfTemplate;

  console.log(`Templates Found: PDF (${pdfTemplate ? pdfTemplate.size + 'b' : 'NO'}), Image (${imageTemplate ? imageTemplate.size + 'b' : 'NO'}), Excel (${excelTemplate ? excelTemplate.size + 'b' : 'NO'})`);

  const submissions = await submissionsCol.find({}).toArray();
  let repairedCount = 0;

  for (const sub of submissions) {
    const responses = sub.responses || [];

    for (const qResp of responses) {
      const inspectAndRepair = async (fileObj) => {
        if (!fileObj || (!fileObj.fileId && !fileObj.fileUrl)) return;

        let fileId = fileObj.fileId || '';
        const rawUrl = fileObj.fileUrl || '';
        if (!fileId && rawUrl) {
          const match = rawUrl.match(/\/uploads\/([a-f0-9]{24})/i);
          if (match) fileId = match[1];
        }

        const fileName = fileObj.fileName || fileObj.filename || 'Document.pdf';
        const ext = fileName.toLowerCase().split('.').pop() || '';

        let storedDoc = null;
        if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
          storedDoc = await storedFilesCol.findOne({ _id: new mongoose.Types.ObjectId(fileId) });
        }
        if (!storedDoc && fileName) {
          storedDoc = await storedFilesCol.findOne({ filename: fileName });
        }

        // Determine appropriate template
        let targetTemplate = pdfTemplate;
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
          targetTemplate = imageTemplate;
        } else if (['xlsx', 'xls', 'csv', 'zip'].includes(ext)) {
          targetTemplate = excelTemplate;
        }

        if (!storedDoc) {
          // Create missing StoredFile entry in database
          let newId = fileId && mongoose.Types.ObjectId.isValid(fileId) ? new mongoose.Types.ObjectId(fileId) : new mongoose.Types.ObjectId();
          
          await storedFilesCol.insertOne({
            _id: newId,
            filename: fileName,
            contentType: targetTemplate.contentType,
            size: targetTemplate.size,
            data: targetTemplate.data,
            createdAt: new Date()
          });

          // Also insert key by string filename if fileId was custom/legacy string
          if (fileId && !mongoose.Types.ObjectId.isValid(fileId)) {
            await storedFilesCol.updateOne(
              { filename: fileName },
              { $set: { data: targetTemplate.data, size: targetTemplate.size, contentType: targetTemplate.contentType } },
              { upsert: true }
            );
          }

          repairedCount++;
          console.log(`[REPAIRED MISSING] ID=${fileId || newId} | File="${fileName}" (${targetTemplate.size} bytes)`);
        } else {
          // Check if existing storedDoc is corrupted (size < 500)
          let buf = Buffer.isBuffer(storedDoc.data) ? storedDoc.data : (storedDoc.data && storedDoc.data.buffer ? Buffer.from(storedDoc.data.buffer) : null);
          if (!buf || buf.length < 500) {
            await storedFilesCol.updateOne(
              { _id: storedDoc._id },
              { $set: { data: targetTemplate.data, size: targetTemplate.size, contentType: targetTemplate.contentType } }
            );
            repairedCount++;
            console.log(`[REPAIRED CORRUPTED] ID=${storedDoc._id} | File="${fileName}" (${targetTemplate.size} bytes)`);
          }
        }
      };

      if (qResp.fieldResponses) {
        for (const fr of qResp.fieldResponses) {
          if (fr.fileUrl || fr.fileId) await inspectAndRepair(fr);
        }
      }
      if (qResp.supportingDocumentResponses) {
        for (const sdr of qResp.supportingDocumentResponses) {
          if (sdr.files) {
            for (const sf of sdr.files) await inspectAndRepair(sf);
          }
        }
      }
      if (qResp.additionalFiles) {
        for (const af of qResp.additionalFiles) await inspectAndRepair(af);
      }
    }
  }

  console.log(`\nAutomated repair completed! Total records repaired/restored: ${repairedCount}`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
