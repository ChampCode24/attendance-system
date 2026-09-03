const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const sendAtRiskEmail = async (lecturerEmail, lecturerName, studentName, matricNumber, courseName, attendanceRate, riskScore) => {
  const mailOptions = {
    from: `"SmartAttendance" <${process.env.GMAIL_USER}>`,
replyTo: process.env.GMAIL_USER,
    to: lecturerEmail,
    subject: `⚠️ At-Risk Student Alert — ${courseName}`,
    headers: {
  'X-Priority': '1',
  'X-MSMail-Priority': 'High',
  'Importance': 'High',
},
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #16a34a; padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 1.4rem;">SmartAttendance</h1>
          <p style="color: #dcfce7; margin: 5px 0 0;">Student Risk Alert</p>
        </div>
        
        <div style="background: #fff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151;">Dear ${lecturerName},</p>
          
          <p style="color: #374151;">This is an automated alert from the SmartAttendance system. The following student has been flagged as <strong style="color: #dc2626;">At Risk</strong> based on their attendance pattern in <strong>${courseName}</strong>:</p>
          
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #dc2626; margin: 0 0 8px;">${studentName}</h2>
            <p style="margin: 4px 0; color: #374151;"><strong>Matric Number:</strong> ${matricNumber}</p>
            <p style="margin: 4px 0; color: #374151;"><strong>Course:</strong> ${courseName}</p>
            <p style="margin: 4px 0; color: #374151;"><strong>Attendance Rate:</strong> ${attendanceRate}%</p>
            <p style="margin: 4px 0; color: #374151;"><strong>Risk Score:</strong> ${Math.round(riskScore * 100)}%</p>
          </div>
          
          <p style="color: #374151;">This student's attendance has fallen below the acceptable threshold. We recommend reaching out to them as soon as possible to provide academic guidance and support.</p>
          
          <p style="color: #374151;">You can view the full Risk Dashboard for this course by logging into SmartAttendance.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="color: #9ca3af; font-size: 0.85rem;">This is an automated message from SmartAttendance. Please do not reply to this email.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Email sending failed:', err);
    return false;
  }
};

module.exports = { sendAtRiskEmail };