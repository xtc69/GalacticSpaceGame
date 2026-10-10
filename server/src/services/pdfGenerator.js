import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import { join } from "path";
import { mkdir } from "fs/promises";

const REPORTS_DIR = join(process.cwd(), "reports");

// Ensure reports directory exists
export async function ensureReportsDir() {
  try {
    await mkdir(REPORTS_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

export async function generateStatsPDF(playerId, playerStats, combatData, economyData) {
  await ensureReportsDir();

  const filename = `stats-report-${playerId}-${Date.now()}.pdf`;
  const filepath = join(REPORTS_DIR, filename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const stream = createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(24).font("Helvetica-Bold").text("Space Battle's - Stats Report", { align: "center" });
      doc.fontSize(12).text(`Generated on ${new Date().toLocaleDateString()}`, { align: "center" });
      doc.moveDown(2);

      // Player Info Section
      doc.fontSize(16).font("Helvetica-Bold").text("Player Information");
      doc.fontSize(11).font("Helvetica");
      doc.text(`Player ID: ${playerId}`);
      doc.text(`Report Date: ${new Date().toISOString()}`);
      doc.moveDown(1);

      // Player Stats Section
      if (playerStats) {
        doc.fontSize(14).font("Helvetica-Bold").text("Player Stats");
        doc.fontSize(11).font("Helvetica");
        doc.text(`Rank: ${playerStats.rank || "N/A"}`);
        doc.text(`Level: ${playerStats.level || 0}`);
        doc.text(`Credits: ${(playerStats.credits || 0).toLocaleString()}`);
        doc.text(`Guild: ${playerStats.guild || "None"}`);
        doc.moveDown(1);

        // Combat Stats
        if (playerStats.stats) {
          doc.fontSize(12).font("Helvetica-Bold").text("Combat Stats");
          doc.fontSize(11).font("Helvetica");
          doc.text(`Attack Power: ${playerStats.stats.attack || 0}`);
          doc.text(`Defense: ${playerStats.stats.defense || 0}`);
          doc.text(`Shield Strength: ${playerStats.stats.shield || 0}`);
          doc.text(`Cargo Capacity: ${(playerStats.stats.cargo || 0).toLocaleString()}`);
          doc.moveDown(2);
        }
      }

      // Combat Log Summary
      if (combatData && combatData.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").text("Combat Summary (Last 7 Days)");
        doc.fontSize(11).font("Helvetica");
        
        const wins = combatData.filter(c => c.outcome === "victory").length;
        const losses = combatData.filter(c => c.outcome === "defeat").length;
        const totalDamage = combatData.reduce((sum, c) => sum + (c.damage_dealt || 0), 0);
        const damageTaken = combatData.reduce((sum, c) => sum + (c.damage_taken || 0), 0);

        doc.text(`Total Battles: ${combatData.length}`);
        doc.text(`Victories: ${wins}`);
        doc.text(`Defeats: ${losses}`);
        doc.text(`Win Rate: ${((wins / combatData.length) * 100).toFixed(2)}%`);
        doc.text(`Total Damage Dealt: ${totalDamage.toLocaleString()}`);
        doc.text(`Total Damage Taken: ${damageTaken.toLocaleString()}`);
        doc.moveDown(2);

        // Recent Battles Table
        doc.fontSize(12).font("Helvetica-Bold").text("Recent Battles");
        doc.fontSize(10).font("Helvetica");
        
        const recentBattles = combatData.slice(-5).reverse();
        recentBattles.forEach((battle, idx) => {
          const date = new Date(battle.event_date).toLocaleDateString();
          doc.text(`${idx + 1}. ${date} - ${battle.outcome} (Damage: ${battle.damage_dealt}/${battle.damage_taken})`, { indent: 20 });
        });
        doc.moveDown(2);
      }

      // Economy Summary
      if (economyData && economyData.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold").text("Economy Summary (Last 7 Days)");
        doc.fontSize(11).font("Helvetica");
        
        const transactions = economyData.length;
        const income = economyData.filter(e => e.event_type === "income").reduce((sum, e) => sum + (e.amount || 0), 0);
        const expenses = economyData.filter(e => e.event_type === "expense").reduce((sum, e) => sum + (e.amount || 0), 0);

        doc.text(`Total Transactions: ${transactions}`);
        doc.text(`Total Income: ${income.toLocaleString()}`);
        doc.text(`Total Expenses: ${expenses.toLocaleString()}`);
        doc.text(`Net Change: ${(income - expenses).toLocaleString()}`);
        doc.moveDown(2);
      }

      // Footer
      doc.fontSize(9).text("This report is confidential and intended for the account holder only.", {
        align: "center",
      });
      doc.text("© Space Battle's - All Rights Reserved", { align: "center" });

      doc.end();

      stream.on("finish", () => {
        resolve(filepath);
      });

      stream.on("error", (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}
