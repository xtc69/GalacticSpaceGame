import nodemailer from "nodemailer";
import { readFile, unlink } from "fs/promises";
import { executeQuery } from "../db.js";
import { generateStatsPDF } from "./pdfGenerator.js";

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendReportEmail(playerId, playerEmail) {
  try {
    // Fetch player stats
    const playerStats = await executeQuery(
      "SELECT * FROM players WHERE id = ?",
      [playerId]
    );

    if (!playerStats || playerStats.length === 0) {
      throw new Error(`Player not found: ${playerId}`);
    }

    const player = playerStats[0];
    const recipientEmail = playerEmail || player.email || process.env.REPORT_ADMIN_EMAIL;

    // Fetch combat logs from last 7 days
    const combatData = await executeQuery(
      `SELECT * FROM combat_logs 
       WHERE player_id = ? AND event_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY event_date DESC`,
      [playerId]
    );

    // Fetch economy events from last 7 days
    const economyData = await executeQuery(
      `SELECT * FROM economy_events 
       WHERE player_id = ? AND event_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY event_date DESC`,
      [playerId]
    );

    // Generate PDF
    const pdfPath = await generateStatsPDF(playerId, player, combatData, economyData);

    // Read PDF file
    const pdfBuffer = await readFile(pdfPath);

    // Send email
    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: recipientEmail,
      subject: `Space Battle's Weekly Stats Report - ${new Date().toLocaleDateString()}`,
      html: generateEmailHTML(player),
      attachments: [
        {
          filename: `stats-report-${playerId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    // Update report status in database
    await executeQuery(
      `INSERT INTO reports (player_id, report_type, title, status, pdf_path, email_sent_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [playerId, "weekly_stats", `Weekly Stats Report - ${new Date().toLocaleDateString()}`, "sent", pdfPath]
    );

    // Clean up PDF file after sending
    try {
      await unlink(pdfPath);
    } catch (e) {
      console.warn(`Could not delete PDF file: ${pdfPath}`, e.message);
    }

    console.log(`Report sent successfully to ${recipientEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending report email:", error);
    
    // Log failure in database
    try {
      await executeQuery(
        `INSERT INTO reports (player_id, report_type, title, status) 
         VALUES (?, ?, ?, ?)`,
        [playerId, "weekly_stats", `Weekly Stats Report - ${new Date().toLocaleDateString()}`, "failed"]
      );
    } catch (dbError) {
      console.error("Error logging report failure to database:", dbError);
    }

    throw error;
  }
}

export async function sendBatchReports(playerIds) {
  const results = {
    sent: [],
    failed: [],
  };

  for (const playerId of playerIds) {
    try {
      await sendReportEmail(playerId);
      results.sent.push(playerId);
    } catch (error) {
      console.error(`Failed to send report for player ${playerId}:`, error.message);
      results.failed.push({ playerId, error: error.message });
    }
  }

  return results;
}

export async function sendAllPlayersWeeklyReports() {
  try {
    // Fetch all players with email
    const players = await executeQuery(
      "SELECT id, email FROM players WHERE email IS NOT NULL"
    );

    if (players.length === 0) {
      console.log("No players with email addresses found");
      return { sent: 0, failed: 0 };
    }

    const playerIds = players.map(p => p.id);
    const results = await sendBatchReports(playerIds);

    console.log(
      `Weekly reports completed. Sent: ${results.sent.length}, Failed: ${results.failed.length}`
    );

    return {
      sent: results.sent.length,
      failed: results.failed.length,
      failedDetails: results.failed,
    };
  } catch (error) {
    console.error("Error sending weekly reports:", error);
    throw error;
  }
}

function generateEmailHTML(player) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a1a1a; color: #fff; padding: 20px; text-align: center; border-radius: 5px; }
          .content { padding: 20px; background-color: #f9f9f9; margin-top: 20px; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          h2 { color: #1a1a1a; }
          .stat-box { background: #fff; padding: 10px; margin: 10px 0; border-left: 4px solid #007bff; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Space Battle's Weekly Stats Report</h1>
            <p>Your detailed gameplay statistics report</p>
          </div>
          
          <div class="content">
            <p>Dear ${player.username},</p>
            
            <p>Your weekly statistics report for Space Battle's is ready! Please see the attached PDF for your detailed stats including:</p>
            
            <ul>
              <li>Player Information & Rank</li>
              <li>Combat Statistics & Win Rate</li>
              <li>Economy Summary & Transactions</li>
              <li>Recent Battles & Performance</li>
            </ul>
            
            <div class="stat-box">
              <h3>Quick Stats</h3>
              <p><strong>Current Level:</strong> ${player.level || 0}</p>
              <p><strong>Rank:</strong> ${player.rank || "N/A"}</p>
              <p><strong>Credits Available:</strong> ${(player.credits || 0).toLocaleString()}</p>
            </div>
            
            <p>If you have any questions about your report or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br/>Space Battle's Reports Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${player.email || 'your account'}. This is an automated message, please do not reply.</p>
            <p>&copy; Space Battle's - All Rights Reserved</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
