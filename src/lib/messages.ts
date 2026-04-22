export const CLEARANCE_MESSAGES = {
  CERTIFICATE_READY: (name: string) => 
    `🎓 Congratulations ${name}! Your university clearance process is officially complete. Please visit the Registrar's Office during office hours to receive your degree. Best of luck for your future endeavors!`,
  
  ISSUE_REPORTED: (name: string, dept: string, remarks: string) => 
    `⚠️ Final Notice for ${name}: There is an outstanding issue with your clearance in the ${dept.toUpperCase()} department. 
Remarks: "${remarks}"
Please resolve this issue immediately to avoid delays in receiving your degree.`,

  GENERAL_NOTICE: (name: string) => 
    `Hello ${name}, this is the University Admin Office. We are reviewing your clearance application. Please ensure all your departmental records are updated.`,

  URGENT_CALL: (name: string) => 
    `🚨 Paging ${name}: Please report to the University Admin Office immediately regarding an urgent matter in your clearance documentation.`
}

export const getWhatsAppLink = (phone: string | null, message: string) => {
  if (!phone) return null;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export const getEmailLink = (email: string, subject: string, body: string) => {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
