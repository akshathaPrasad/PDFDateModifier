const fs = require('fs');
const path = require('path');
const express = require('express');
const fileUpload = require('express-fileupload');
const { fromBuffer } = require('file-type');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const app = express();
app.use(fileUpload());

app.post('/updateDateInPDF', (req, res) => {
    if (!(req.files && req.files.file)) {
        res.status(400).send('Please upload a PDF file.');
    } else if (!req.query.updateDateTo || typeof req.query.updateDateTo !== 'string') {
        res.status(400).send('Please pass the value to which the date needs to be updated.');
    } else {
        pdfModifier(req.query.updateDateTo, req.files.file.data, (err, result) => {
            if (err) {
                return res.status(400).send(err);
            } else {
                res.send(result);
            }
        });
    }
});

app.listen(4000, () => {
    console.log('Listening on port 4000');
});

function pdfModifier(updateDateTo, existingPdfBytes, callback) {
    // Making sure the uploaded file is a valid PDF
    fromBuffer(existingPdfBytes).then(async ({ ext }) => {
        if (ext !== 'pdf') {
            callback('Please upload a valid PDF file.');
        } else {
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
            // Get the first page of the document
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
    
            // Drawing a white rectangle over the date string
            firstPage.drawRectangle({
                x: 106,
                y: 750,
                width: 150,
                height: 10,
                borderColor: rgb(1, 1, 1),
                borderWidth: 10,
            });
    
            if (updateDateTo === 'current') {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const today = new Date();
                updateDateTo = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
            }
            
            // Writing the input date at the same position as the original date string
            firstPage.drawText(updateDateTo, {
                x: 105,
                y: 750,
                size: 12,
                font: helveticaFont,
                color: rgb(0, 0, 0)
            });
    
            // Serialize the PDFDocument to bytes (a Uint8Array)
            const pdfBytes = await pdfDoc.save();
            const outputFilename = `ModifiedPDF_${Date.now()}.pdf`;
            fs.writeFileSync(outputFilename, pdfBytes);
            callback(null, path.resolve(`./${outputFilename}`));
        }
    });
}