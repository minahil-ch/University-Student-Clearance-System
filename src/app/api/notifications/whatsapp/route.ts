import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { name, phone, recipientPhone, department, status, remarks, eventType, regNo } = data

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
    
    if (!accountSid || !authToken || accountSid === 'your-sid') {
      console.warn("Twilio credentials not configured. WhatsApp skipped.")
      return NextResponse.json({ status: 'skipped', message: 'Credentials missing' })
    }

    const toPhone = recipientPhone || phone
    if (!toPhone) {
      return NextResponse.json({ status: 'skipped', message: 'Recipient phone missing' })
    }

    let messageContent = `*University Clearance Update*\n\nHello *${name}*`
    if (eventType === 'form_submission') {
      messageContent = `*New Clearance Request*\n\nStudent: *${name}*\nReg No: *${regNo || 'N/A'}*\nDepartment: *${department || 'N/A'}*\n\nPlease review this request in your portal.`
    } else if (status === 'cleared') {
      messageContent = `*University Clearance Update*\n\nHello *${name}*,\nYour clearance for *${department}* has been *APPROVED*! ✅\n\n_System Admin_`
    } else if (status === 'issue') {
      messageContent = `*University Clearance Update*\n\nHello *${name}*,\nAn *ISSUE* was reported in your *${department}* clearance.\n\n*Remarks:* ${remarks || 'Please check portal'}. ⚠️\n\n_System Admin_`
    }

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: `whatsapp:${toPhone}`,
        From: fromWhatsApp,
        Body: messageContent
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || "Twilio error")
    }

    return NextResponse.json({ status: 'success', sid: result.sid })
  } catch (error: any) {
    console.error("WhatsApp API Error:", error)
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 })
  }
}
