import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: `"Future Savings Foundation" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    })
    console.log("Email sent successfully to:", to)
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}