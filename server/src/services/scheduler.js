import schedule from "node-schedule";
import { sendAllPlayersWeeklyReports } from "./reportService.js";

let scheduledJob = null;

export function initializeScheduler() {
  try {
    // Parse schedule from environment variable (cron format)
    // Default: 0 0 * * 1 = Every Monday at 00:00 UTC
    const schedulePattern = process.env.REPORT_SCHEDULE || "0 0 * * 1";

    scheduledJob = schedule.scheduleJob(schedulePattern, async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled weekly reports...`);
      try {
        const results = await sendAllPlayersWeeklyReports();
        console.log(`[${new Date().toISOString()}] Scheduled reports completed:`, results);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in scheduled report job:`, error);
      }
    });

    console.log(`Report scheduler initialized. Schedule: ${schedulePattern}`);
    console.log("(Use cron format in REPORT_SCHEDULE env variable to customize)");

    // Optional: Log next scheduled run times
    const nextInvocations = scheduledJob.nextInvocation();
    console.log(`Next scheduled report: ${nextInvocations}`);
  } catch (error) {
    console.error("Error initializing report scheduler:", error);
  }
}

export function stopScheduler() {
  if (scheduledJob) {
    scheduledJob.cancel();
    console.log("Report scheduler stopped");
  }
}

export function getSchedulerStatus() {
  return {
    isActive: scheduledJob !== null,
    nextInvocation: scheduledJob ? scheduledJob.nextInvocation() : null,
    schedule: process.env.REPORT_SCHEDULE || "0 0 * * 1",
  };
}

// Cron format reference:
//   ┌───────────── second (0 - 59)
//   │ ┌───────────── minute (0 - 59)
//   │ │ ┌───────────── hour (0 - 23)
//   │ │ │ ┌───────────── day of month (1 - 31)
//   │ │ │ │ ┌───────────── month (0 - 11)
//   │ │ │ │ │ ┌───────────── day of week (0 - 6) (0 = Sunday, 1 = Monday, etc)
//   │ │ │ │ │ │
//   │ │ │ │ │ │
//   * * * * * *
//
// Examples:
// "0 0 * * 0" - Every Sunday at 00:00
// "0 0 * * 1" - Every Monday at 00:00 (default)
// "0 9 * * *" - Every day at 09:00
// "0 0 1 * *" - First day of each month at 00:00
// "0 */6 * * *" - Every 6 hours
