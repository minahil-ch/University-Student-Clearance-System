/**
 * 🎓 University Clearance System - Master Webhook
 * Handles: 
 * 1. Data logging to Google Sheets (ID: 17270Wgj_67lEfp2HAuRxekZtryK7gUiteVks2Pb6ydQ)
 * 2. Real-time Email Notifications
 */

const SECRET_TOKEN = "SECURE_KEY_123";
const SPREADSHEET_ID = "17270Wgj_67lEfp2HAuRxekZtryK7gUiteVks2Pb6ydQ";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 1. Security Check
    if (data.token !== SECRET_TOKEN) {
      return response({ status: "error", message: "Unauthorized" });
    }

    const { type, payload } = data;

    // 2. Handle Student Form Submission (Logging to Sheet)
    if (type === "FORM_SUBMISSION") {
      logToSheet(payload);
      return response({ status: "success", message: "Data logged to sheet" });
    }

    // 3. Handle Status Update (Email Notification)
    if (type === "STATUS_UPDATE") {
      sendClearanceEmail(payload);
      return response({ status: "success", message: "Email sent" });
    }

    return response({ status: "error", message: "Unknown event type" });

  } catch (err) {
    return response({ status: "error", message: err.toString() });
  }
}

function logToSheet(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets()[0]; // Use first sheet
  
  // Header: Timestamp, Reg No, Name, Email, Phone, Dept, CGPA
  sheet.appendRow([
    new Date().toLocaleString(),
    data.reg_no,
    data.name,
    data.email,
    data.phone || 'N/A',
    data.department,
    data.cgpa || 'N/A'
  ]);
}

function sendClearanceEmail(payload) {
  const { name, email, registrationNo, department, status, remarks } = payload;
  const timestamp = new Date().toLocaleString();
  
  let subject = "University Clearance Update";
  let htmlBody = "";
  
  if (status === 'CLEARED') {
    subject = "🎉 Congratulations! Your Final Clearance is Approved";
    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">Clearance Completed</h2>
        <p>Dear <strong>${name}</strong>,</p>
        <p>Your university clearance has been fully approved by the <strong>Academic Department</strong>.</p>
        <hr style="border-top: 1px solid #eee; margin: 20px 0;"/>
        <table style="text-align: left; border-collapse: collapse; width: 100%;">
          <tr><th style="padding: 8px; border-bottom: 1px solid #eee;">Registration Number</th><td style="padding: 8px; border-bottom: 1px solid #eee;">${registrationNo}</td></tr>
          <tr><th style="padding: 8px; border-bottom: 1px solid #eee;">Department</th><td style="padding: 8px; border-bottom: 1px solid #eee;">${department}</td></tr>
          <tr><th style="padding: 8px; border-bottom: 1px solid #eee;">Status</th><td style="padding: 8px; border-bottom: 1px solid #eee; color: green; font-weight: bold;">✅ ${status}</td></tr>
          <tr><th style="padding: 8px; border-bottom: 1px solid #eee;">Timestamp</th><td style="padding: 8px; border-bottom: 1px solid #eee;">${timestamp}</td></tr>
        </table>
        <br/>
        <p>You can now proceed with receiving your final degree or transcript.</p>
        <p>Best regards,<br/><strong>Academic Department</strong></p>
      </div>
    `;
  } else {
    // Rejected or intermediate status
    const statusColor = status.toLowerCase().includes('reject') ? '#dc2626' : '#f59e0b';
    subject = `Clearance Update: ${department} [${status.toUpperCase()}]`;
    
    htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #1f2937; text-align: center;">Clearance Update</h2>
        <p>Dear <strong>${name}</strong>,</p>
        <p>There has been an update to your clearance status in the <strong>${department}</strong> portal.</p>
        
        <div style="margin: 20px 0; padding: 15px; background: ${statusColor}10; border-left: 5px solid ${statusColor}; border-radius: 4px;">
          <p style="margin: 0; color: ${statusColor}; font-weight: bold; font-size: 14px; text-transform: uppercase;">Current Status</p>
          <p style="margin: 5px 0 0; color: #111827; font-size: 20px; font-weight: bold;">${status.toUpperCase()}</p>
        </div>

        ${remarks ? `
        <div style="margin-bottom: 20px; background: #f9fafb; padding: 15px; border-radius: 4px;">
          <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase;">Remarks:</p>
          <p style="margin: 0; color: #374151; font-style: italic;">"${remarks}"</p>
        </div>
        ` : ''}

        <p style="color: #4b5563; font-size: 14px;">Please check your student dashboard for more details and to resolve any pending issues.</p>
        <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="color: #9ca3af; font-size: 12px;">Automated system notification.</p>
        </div>
      </div>
    `;
  }

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
