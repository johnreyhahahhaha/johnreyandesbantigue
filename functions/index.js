const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

exports.helloParish = onRequest((request, response) => {
  response.send("Mabuhay! Ang iyong St. Joseph Parish server ay active na!");
});     

const runCemeteryContractNotifications = async () => {
  const apiBaseUrl = process.env.PARISH_API_URL;
  if (!apiBaseUrl) {
    throw new Error("PARISH_API_URL is not configured");
  }

  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, '')}/check-cemetery-contract-notifications.php`
  );
  if (!response.ok) {
    throw new Error(`Cemetery notification endpoint returned HTTP ${response.status}`);
  }

  return response.json();
};

// Runs daily so notifications do not depend on an administrator opening the app.
exports.dailyCemeteryContractNotifications = onSchedule(
  {
    schedule: "0 1 * * *",
    timeZone: "Asia/Manila",
  },
  async () => {
    const result = await runCemeteryContractNotifications();
    console.log("Cemetery contract notification check completed", result);
  }
);

exports.runCemeteryContractNotifications = onRequest(async (request, response) => {
  try {
    const result = await runCemeteryContractNotifications();
    response.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Cemetery contract notification check failed", error);
    response.status(500).json({ success: false, message: error.message });
  }
});