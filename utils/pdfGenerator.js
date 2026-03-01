import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generates a PDF prescription and saves it to the public folder
 * @param {Object} prescription - The populated prescription object
 * @returns {String} - URL path to the generated PDF
 */
export const generatePrescriptionPDF = async (prescription) => {
  return new Promise((resolve, reject) => {
    try {
      // Create public/prescriptions directory structure if it doesn't exist
      const publicDir = path.join(process.cwd(), 'public');
      const prescriptionsDir = path.join(publicDir, 'prescriptions');
      
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
      }
      if (!fs.existsSync(prescriptionsDir)) {
        fs.mkdirSync(prescriptionsDir);
      }

      // Format current date
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `prescription_${prescription._id}_${dateStr}.pdf`;
      const filePath = path.join(prescriptionsDir, fileName);

      // Create PDF Document
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // Clinic Header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('Smart Clinic SaaS', { align: 'center' });
      doc.fontSize(10)
         .font('Helvetica')
         .text('123 Medical Avenue, Health City', { align: 'center' })
         .text('Phone: +1 234 567 890 | Email: contact@smartclinic.com', { align: 'center' });
      
      doc.moveDown(2);
      
      // Divider
      doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Details Section
      doc.fontSize(12).font('Helvetica-Bold').text('Doctor Details:');
      doc.font('Helvetica').fontSize(10)
         .text(`Dr. ${prescription.doctorId.name}`)
         .text(`Specialization: ${prescription.doctorId.specialization}`);
      
      doc.moveUp(2);
      
      doc.fontSize(12).font('Helvetica-Bold').text('Patient Details:', { align: 'right' });
      doc.font('Helvetica').fontSize(10)
         .text(`Name: ${prescription.patientId.name}`, { align: 'right' })
         .text(`Age/Gender: ${prescription.patientId.age} / ${prescription.patientId.gender}`, { align: 'right' })
         .text(`Contact: ${prescription.patientId.contact}`, { align: 'right' });
      
      doc.moveDown(2);
      doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(2);

      // Medical Info
      doc.fontSize(12).font('Helvetica-Bold').text('Diagnosis:');
      doc.font('Helvetica').fontSize(10).text(prescription.diagnosis);
      doc.moveDown();
      
      doc.fontSize(12).font('Helvetica-Bold').text('Symptoms:');
      doc.font('Helvetica').fontSize(10).text(prescription.symptoms);
      doc.moveDown(2);

      // Rx (Medicines)
      doc.fontSize(18).font('Helvetica-Oblique').text('Rx', { continued: true });
      doc.font('Helvetica').fontSize(12).text(''); // Reset
      doc.moveDown();

      if (prescription.medicines && prescription.medicines.length > 0) {
        prescription.medicines.forEach((med, index) => {
          doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. ${med.name} (${med.dosage}, ${med.form})`);
          doc.fontSize(10).font('Helvetica').text(`   Instructions: ${med.frequency} for ${med.duration}`);
          if (med.instructions) {
             doc.text(`   Note: ${med.instructions} - ${med.beforeFood ? 'Before Food' : 'After Food'}`);
          }
          doc.moveDown();
        });
      } else {
        doc.fontSize(10).text('No medicines prescribed.');
      }
      
      // Tests
      if (prescription.tests && prescription.tests.length > 0) {
        doc.moveDown();
        doc.fontSize(12).font('Helvetica-Bold').text('Prescribed Tests:');
        prescription.tests.forEach(test => {
          doc.fontSize(10).font('Helvetica').text(`- ${test.name}: ${test.instructions || 'N/A'}`);
        });
      }

      // Advice
      if (prescription.advice) {
        doc.moveDown();
        doc.fontSize(12).font('Helvetica-Bold').text('Doctor\'s Advice:');
        doc.fontSize(10).font('Helvetica').text(prescription.advice);
      }

      // Follow up
      if (prescription.followUpDate) {
        doc.moveDown();
        doc.fontSize(12).font('Helvetica-Bold').text('Follow up Date:');
        doc.fontSize(10).font('Helvetica').text(new Date(prescription.followUpDate).toLocaleDateString());
      }

      // Footer
      doc.moveDown(4);
      doc.fontSize(10).text('_________________________', { align: 'right' });
      doc.text("Doctor's Signature", { align: 'right' });
      
      // Complete PDF
      doc.end();

      stream.on('finish', () => {
        // Return URL accessible by frontend
        resolve(`/prescriptions/${fileName}`);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
};
