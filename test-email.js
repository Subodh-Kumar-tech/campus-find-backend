require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

async function testEmail() {
    console.log("Starting email test...");
    console.log("Using EMAIL_USER:", process.env.EMAIL_USER);

    try {
        await sendEmail({
            email: process.env.EMAIL_USER, // Send to self for testing
            subject: "Campus Connect: Test Email Notification",
            message: "Hello, this is a test email to verify that the notification system is working correctly with the new personalized templates!"
        });
        console.log("✅ Test email sent successfully!");
    } catch (error) {
        console.error("❌ Failed to send test email:", error);
    }
}

testEmail();
