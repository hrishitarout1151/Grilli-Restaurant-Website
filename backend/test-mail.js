require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const nodemailer = require('nodemailer');
const user = process.env.SMTP_USER;
const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
console.log('SMTP_USER:', user || '(missing - .env not read)');
console.log('SMTP_PASS length:', pass.length, '(must be 16)');
if (!user || !pass) process.exit(1);
nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
  .sendMail({ from: user, to: user, subject: 'Grilli test email', text: 'If you can read this, email sending works.' })
  .then(() => console.log('SENT - check your inbox and spam'))
  .catch((e) => console.log('FAILED:', e.message));