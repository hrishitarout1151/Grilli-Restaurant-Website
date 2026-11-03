'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

const USER = process.env.SMTP_USER || '';
const PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
const TO = process.env.MAIL_TO || USER;

const transport = (USER && PASS)
  ? nodemailer.createTransport({ service: 'gmail', auth: { user: USER, pass: PASS } })
  : null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();

function status() {
  return transport ? 'on, messages go to ' + TO : 'NOT set up - messages are saved in the admin panel only';
}

async function sendContact({ name, email, message }) {
  if (!transport) return { sent: false };
  try {
    await transport.sendMail({
      from: '"Grilli Website" <' + USER + '>',
      to: TO,
      replyTo: '"' + oneLine(name).replace(/"/g, '') + '" <' + oneLine(email) + '>',
      subject: 'New message from ' + oneLine(name) + ' - Grilli website',
      text: 'Name: ' + oneLine(name) + '\nEmail: ' + oneLine(email) + '\n\n' + message,
      html: '<p><b>Name:</b> ' + esc(name) + '<br><b>Email:</b> ' + esc(email) + '</p><p>' + esc(message).replace(/\n/g, '<br>') + '</p>',
    });
    return { sent: true };
  } catch (e) {
    console.error('Email failed:', e.message);
    return { sent: false };
  }
}

module.exports = { sendContact, status, TO };