const SHEET_ID = "17270Wgj_67lEfp2HAuRxekZtryK7gUiteVks2Pb6ydQ";
const SECRET_TOKEN = "SECURE_KEY_123";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    if (body.token !== SECRET_TOKEN) {
      return jsonResponse({ ok: false, error: "Unauthorized token" });
    }

    const payload = body.payload || {};
    const type = String(body.type || "FORM_SUBMISSION");
    const sheet = getOrCreateSheet("Clearance_Events");

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Type",
        "Name",
        "Email",
        "Phone",
        "Reg No",
        "Department",
        "Status",
        "Remarks",
      ]);
    }

    sheet.appendRow([
      new Date(),
      type,
      payload.name || "",
      payload.email || "",
      payload.phone || "",
      payload.reg_no || payload.regNo || "",
      payload.department || "",
      payload.status || "",
      payload.remarks || "",
    ]);

    if (type === "STATUS_UPDATE" && payload.status === "cleared" && String(payload.department || "").startsWith("ACADEMIC")) {
      MailApp.sendEmail({
        to: payload.recipient_email || payload.email,
        subject: "University Clearance Completed",
        htmlBody: `<p>Dear ${payload.name || "Student"},</p>
          <p>Your clearance is complete and approved by all departments including Academic.</p>
          <p>You can collect your result card from the concerned office.</p>`,
      });
    } else {
      MailApp.sendEmail({
        to: payload.recipient_email || payload.email,
        subject: `Clearance Update - ${payload.department || "University"}`,
        htmlBody: `<p>Hello ${payload.name || "Student"},</p><p>Your clearance update has been recorded.</p>`,
      });
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
