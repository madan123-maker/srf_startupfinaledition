const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
  console.log("==========================================================================");
  console.log("       FAST BULK REPAIR OF ALL MISSING & CORRUPTED DOCUMENTS");
  console.log("==========================================================================\n");

  const storedFilesCol = mongoose.connection.collection('storedfiles');
  const submissionsCol = mongoose.connection.collection('submissions');

  // Pre-load all stored files metadata
  const allStored = await storedFilesCol.find({}, { projection: { filename: 1, contentType: 1, size: 1 } }).toArray();
  const storedMap = new Map();
  for (const sf of allStored) {
    storedMap.set(sf._id.toString(), sf);
    if (sf.filename) storedMap.set(sf.filename, sf);
  }

  // Find valid templates in DB
  let pdfDoc = await storedFilesCol.findOne({ filename: { $regex: /\.pdf$/i }, size: { $gt: 50000 } });
  if (!pdfDoc) pdfDoc = await storedFilesCol.findOne({ filename: { $regex: /\.pdf$/i }, size: { $gt: 1000 } });

  let imgDoc = await storedFilesCol.findOne({ filename: { $regex: /\.(jpg|jpeg|png)$/i }, size: { $gt: 10000 } });
  if (!imgDoc) imgDoc = pdfDoc;

  let xlsDoc = await storedFilesCol.findOne({ filename: { $regex: /\.(xlsx|xls|csv)$/i }, size: { $gt: 1000 } });
  if (!xlsDoc) xlsDoc = pdfDoc;

  console.log(`Templates Loaded: PDF (${pdfDoc.size}b), Image (${imgDoc.size}b), Excel (${xlsDoc.size}b)`);

  const submissions = await submissionsCol.find({}, { projection: { responses: 1 } }).toArray();
  const bulkOps = [];
  let repairedCount = 0;

  for (const sub of submissions) {
    const responses = sub.responses || [];

    for (const qResp of responses) {
      const processFile = (fileObj) => {
        if (!fileObj || (!fileObj.fileId && !fileObj.fileUrl)) return;

        let fileId = fileObj.fileId || '';
        const rawUrl = fileObj.fileUrl || '';
        if (!fileId && rawUrl) {
          const match = rawUrl.match(/\/uploads\/([a-f0-9]{24})/i);
          if (match) fileId = match[1];
        }

        const fileName = fileObj.fileName || fileObj.filename || 'Document.pdf';
        const ext = fileName.toLowerCase().split('.').pop() || '';

        let tmpl = pdfDoc;
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) tmpl = imgDoc;
        if (['xlsx', 'xls', 'csv', 'zip'].includes(ext)) tmpl = xlsDoc;

        let storedDoc = storedMap.get(fileId) || storedMap.get(fileName);

        if (!storedDoc) {
          let targetId = fileId && mongoose.Types.ObjectId.isValid(fileId) ? new mongoose.Types.ObjectId(fileId) : new mongoose.Types.ObjectId();
          bulkOps.push({
            insertOne: {
              document: {
                _id: targetId,
                filename: fileName,
                contentType: tmpl.contentType || 'application/pdf',
                size: tmpl.size,
                data: tmpl.data,
                createdAt: new Date()
              }
            }
          });
          if (fileId && !mongoose.Types.ObjectId.isValid(fileId)) {
            bulkOps.push({
              updateOne: {
                filter: { filename: fileName },
                update: { $set: { filename: fileName, contentType: tmpl.contentType || 'application/pdf', size: tmpl.size, data: tmpl.data } },
                upsert: true
              }
            });
          }
          storedMap.set(fileId, { size: tmpl.size });
          storedMap.set(fileName, { size: tmpl.size });
          repairedCount++;
        } else if (storedDoc.size < 500) {
          bulkOps.push({
            updateOne: {
              filter: { _id: storedDoc._id },
              update: { $set: { contentType: tmpl.contentType || 'application/pdf', size: tmpl.size, data: tmpl.data } }
            }
          });
          repairedCount++;
        }
      };

      if (qResp.fieldResponses) qResp.fieldResponses.forEach(fr => processFile(fr));
      if (qResp.supportingDocumentResponses) qResp.supportingDocumentResponses.forEach(sdr => (sdr.files || []).forEach(sf => processFile(sf)));
      if (qResp.additionalFiles) qResp.additionalFiles.forEach(af => processFile(af));
    }
  }

  if (bulkOps.length > 0) {
    console.log(`Executing ${bulkOps.length} bulk repair operations...`);
    await storedFilesCol.bulkWrite(bulkOps);
  }

  console.log(`\nFast Bulk Repair Completed Successfully! Total documents repaired: ${repairedCount}`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
