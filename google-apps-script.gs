/**
 * 🎓 University Clearance System - Master Webhook (V2)
 * Handles: 
 * 1. Data logging to Google Sheets (ID: 17270Wgj_67lEfp2HAuRxekZtryK7gUiteVks2Pb6ydQ)
 * 2. Real-time Email Notifications with Rich HTML Templates
 */

const SECRET_TOKEN = "SECURE_KEY_123";
const SPREADSHEET_ID = "17270Wgj_67lEfp2HAuRxekZtryK7gUiteVks2Pb6ydQ";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 1. Security Check
    if (data.token !== SECRET_TOKEN) {
      return response({ ok: false, error: "Unauthorized" });
    }

    const { type, payload } = data;
    const eventType = String(type || "").toUpperCase();

    // 2. Logging to sheet (Always log events)
    logEvent(eventType, payload);

    // 3. Specific Logic
    if (eventType === "FORM_SUBMISSION") {
      // Just logging is enough, logEvent already did it
      return response({ ok: true, message: "Submission logged" });
    }

    if (eventType === "STATUS_UPDATE" || eventType === "PORTAL_ALERT") {
      sendClearanceEmail(payload);
      return response({ ok: true, message: "Email sent" });
    }

    return response({ ok: false, error: "Unknown event type: " + eventType });

  } catch (err) {
    console.error("Webhook Error:", err);
    return response({ ok: false, error: err.toString() });
  }
}

function logEvent(type, payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName("Clearance_Logs");
    if (!sheet) {
      sheet = ss.insertSheet("Clearance_Logs");
      sheet.appendRow(["Timestamp", "Type", "Name", "Reg No", "Email", "Department", "Status", "Remarks"]);
    }
    
    sheet.appendRow([
      new Date().toLocaleString(),
      type,
      payload.name || "N/A",
      payload.reg_no || payload.regNo || "N/A",
      payload.recipient_email || payload.email || "N/A",
      payload.department || "N/A",
      payload.status || "N/A",
      payload.remarks || "N/A"
    ]);
  } catch (err) {
    console.error("Logging Error:", err);
  }
}

function sendClearanceEmail(payload) {
  const { name, recipient_email, email, reg_no, regNo, department, status, remarks } = payload;
  const targetEmail = recipient_email || email;
  const regIdentifier = reg_no || regNo || "N/A";
  const timestamp = new Date().toLocaleString();
  const currentStatus = (status || "Update").toUpperCase();
  
  if (!targetEmail) return;

  let subject = "University Clearance Update";
  let htmlBody = "";
  
  // If status is CLEARED and department is ACADEMIC, it's the final approval
  const isFinalApproval = currentStatus === 'CLEARED' && (String(department || "").toUpperCase().includes("ACADEMIC"));

  if (isFinalApproval) {
    subject = "🎉 Congratulations! Your Final Clearance is Approved";
    htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 40px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="background: #10b981; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <span style="color: white; font-size: 30px;">✓</span>
          </div>
          <h2 style="color: #059669; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase;">Clearance Completed</h2>
        </div>
        
        <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">Great news! Your final university clearance has been officially approved by the <strong>Academic Head</strong>. You are now cleared for graduation and certificate issuance.</p>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Registration No</td><td style="padding: 8px 0; text-align: right; font-weight: 700;">${regIdentifier}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Department</td><td style="padding: 8px 0; text-align: right; font-weight: 700;">${department}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Status</td><td style="padding: 8px 0; text-align: right; color: #059669; font-weight: 800;">✅ APPROVED</td></tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #475569;">You can collect your official documents from the Registrar's office during office hours.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;"/>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">This is an automated notification from the University Clearance System.</p>
      </div>
    `;
  } else {
    const isIssue = currentStatus === 'ISSUE';
    const statusColor = isIssue ? '#ef4444' : '#f59e0b';
    const statusLabel = isIssue ? 'ISSUE REPORTED' : currentStatus;
    
    subject = `Clearance Update: ${department} [${statusLabel}]`;
    
    htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 40px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #334155; text-align: center; margin-bottom: 30px; font-size: 20px; font-weight: 800; text-transform: uppercase;">Clearance Status Update</h2>
        <p style="font-size: 16px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">There is a new update regarding your clearance request from the <strong>${department}</strong> portal.</p>
        
        <div style="margin: 25px 0; padding: 20px; background: ${statusColor}10; border-left: 4px solid ${statusColor}; border-radius: 8px;">
          <p style="margin: 0; color: ${statusColor}; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">New Status</p>
          <p style="margin: 5px 0 0; color: #0f172a; font-size: 22px; font-weight: 900;">${statusLabel}</p>
        </div>

        ${remarks ? `
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase;">Department Remarks:</p>
          <p style="margin: 0; color: #334155; font-style: italic; line-height: 1.5;">"${remarks}"</p>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #475569; text-align: center;">Please log in to your dashboard to take any required actions.</p>
        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <p style="color: #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em;">University Automated System</p>
        </div>
      </div>
    `;
  }

  try {
    MailApp.sendEmail({
      to: targetEmail,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (err) {
    console.error("Email Sending Failed:", err);
  }
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
