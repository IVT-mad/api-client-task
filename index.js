const axios = require("axios");
const { google } = require("googleapis");
require("dotenv").config();

const API_URL = process.env.API_URL;
let token = "";

// Register a new user
async function registerUser(username) {
    console.log("Registering user...");
    await axios.post(`${API_URL}/auth/registration`, { username });
    console.log("User registered.");
}

// Log in a user
async function loginUser(username) {
    console.log("Logging in...");
    const response = await axios.post(`${API_URL}/auth/login`, { username });
    token = response.data.token;
    console.log("Login successful.");
}

// Fetch clients
async function getClients(limit = 1000, offset = 0) {
    console.log("Fetching clients...");
    const response = await axios.get(`${API_URL}/clients`, {
        headers: { Authorization: token },
        params: { limit, offset },
    });
    console.log("Clients fetched.");
    return response.data || [];
}

// Fetch client statuses
async function getClientStatuses(userIds) {
    console.log("Fetching client statuses...");
    const response = await axios.post(
        `${API_URL}/clients`,
        { userIds },
        {
            headers: {
                Authorization: token,
                "Content-Type": "application/json",
            },
        }
    );
    console.log("Client statuses fetched.");
    return response.data;
}

// Format clients for Google Sheets
function formatClients(clients) {
    return clients.map(client => [
        client.id,
        client.firstName,
        client.lastName,
        client.gender,
        client.address,
        client.city,
        client.phone,
        client.email,
        client.status || "Unknown",
    ]);
}

// Write data to Google Sheets
async function writeToGoogleSheet(data) {
    console.log("Writing data to Google Sheets...");
    const auth = new google.auth.GoogleAuth({
        keyFile: "constant-idiom-438206-g6-cc24a63fd709.json",
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Sheet1!A1",
        valueInputOption: "RAW",
        resource: {
            values: [["ID", "First Name", "Last Name", "Gender", "Address", "City", "Phone", "Email", "Status"], ...data],
        },
    });
    console.log("Data written to Google Sheets.");
}

// Main process
async function main() {
    const username = `${process.env.USERNAME}_${Date.now()}`;

    console.log("Starting process...");
    await registerUser(username);
    await loginUser(username);

    const clients = await getClients();

    if (clients.length === 0) {
        console.error("No clients returned from API.");
        return;
    }

    const userIds = clients.map(client => client.id);
    const statuses = await getClientStatuses(userIds);

    const clientsWithStatuses = clients.map(client => {
        const statusObj = statuses.find(status => status.id === client.id);
        return {
            ...client,
            status: statusObj ? statusObj.status : "Unknown",
        };
    });

    const formattedClients = formatClients(clientsWithStatuses);
    await writeToGoogleSheet(formattedClients);
    console.log("Process completed successfully.");
}

// Run the program
main().catch(console.error);