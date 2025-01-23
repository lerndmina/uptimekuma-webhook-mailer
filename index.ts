import nodemailer from "nodemailer";
import { isUptimeKumaWebhook, type UptimeKumaMonitor, type UptimeKumaWebhook } from "./types";
import fs from "fs";
import path from "path";
import { Liquid } from "liquidjs";
import { log } from "console";

const creds = {
  user: process.env.EMAIL_USER,
  to: process.env.EMAIL_TO,
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
  webhookToken: process.env.WEBHOOK_TOKEN,
};

function main() {
  const missingCreds = Object.keys(creds).filter((key) => !creds[key as keyof typeof creds]);
  if (missingCreds.length) {
    console.error("Missing email credentials:", missingCreds.join(", "));
    process.exit(1);
  }

  console.log("Starting server...");

  Bun.serve({
    port: 8080,
    async fetch(req) {
      const url = new URL(req.url);

      // Add health check endpoint
      if (url.pathname === "/webhook/health") {
        return new Response("OK", { status: 200 });
      }

      // Check the path for the webhook token
      if (url.pathname === "/webhook") {
        const token = url.searchParams.get("token");
        if (token === creds.webhookToken) {
          console.log("Valid webhook request with token:", token);
          const emailSent = await sendMail(req);
          return emailSent;
        } else {
          console.log("Unauthorized request with token:", token);
          // Return a 401 for an invalid token
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // Return a 400 for any other request
      return new Response("Bad request\n" + help, { status: 400 });
    },
  });
}
main();

/*
 ** Description: Send an email with the given request data
 ** Returns: boolean (true if the email was sent successfully)
 */
async function sendMail(req: Request): Promise<Response> {
  let data;
  try {
    if (req.body) {
      data = await req.json();
      if (!isUptimeKumaWebhook(data)) {
        throw new Error("Invalid data format");
      }
    } else {
      throw new Error("No request body");
    }
  } catch (e) {
    console.error("Invalid JSON data:", e);
    return new Response("Invalid JSON data\n" + (e instanceof Error ? e.toString() : String(e)) + `\n${help}`, { status: 400 });
  }

  console.log("Sending email with data:", data);

  // Request is valid, send the email
  const transporter = nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    auth: {
      user: creds.user,
      pass: creds.pass,
    },
  });

  const mailOptions = {
    from: creds.from,
    to: creds.to,
    subject: data.msg,
    text: getPlainTextEmail(data),
    html: await getEmailTextFromFile(data),
  };

  await transporter.sendMail(mailOptions);

  return new Response(
    `
Email sent to ${creds.to} with the following data:
${JSON.stringify(data, null, 2)}
    `,
    { status: 200 }
  );
}

async function getEmailTextFromFile(data: UptimeKumaWebhook): Promise<string> {
  // Data is stored in email.html in this directory read in the string and return it
  const filePath = path.join(__dirname, "email.html");
  const rawData = fs.readFileSync(filePath, "utf8");
  const engine = new Liquid();
  const tpl = engine.parse(rawData);
  const html = await engine.render(tpl, data);
  return html;
}

function getPlainTextEmail(data: UptimeKumaWebhook): string {
  const status = data.heartbeat.status === 0 ? "DOWN" : "UP";
  return `
MONITOR ALERT: ${data.monitor.name}
===============================
Status: [${status}]
Time: ${data.heartbeat.localDateTime}
Duration: ${data.heartbeat.duration} seconds
Message: ${data.heartbeat.msg}

Monitor Details:
---------------
URL: ${data.monitor.url}
Type: ${data.monitor.type}
Retries: ${data.heartbeat.retries}
Priority: ${data.heartbeat.important ? "High" : "Normal"}

Timezone Info: ${data.heartbeat.timezone} (${data.heartbeat.timezoneOffset})

Looks like your email client doesn't support HTML emails. For a better experience, please enable HTML emails so we can send you fancy emails in the future.
`;
}

const help = `
Usage:
- POST /webhook?token=secret-token

Parameters:
- token: The webhook token to authorize the request

Data:
- The request body should be a JSON matching the format of an uptimekuma webhook.

Example:
${JSON.stringify(getExampleData(), null, 2)}
`;

function getExampleData(): UptimeKumaWebhook {
  return {
    heartbeat: {
      monitorID: 1,
      status: 0,
      time: "2024-01-23 16:18:51.838",
      msg: "No heartbeat in the time window",
      important: true,
      duration: 61,
      retries: 1,
      timezone: "Europe/London",
      timezoneOffset: "+00:00",
      localDateTime: "2024-01-23 16:18:51",
    },
    monitor: {
      id: 1,
      name: "Example Monitor",
      url: "https://example.com",
      type: "push",
      active: true,
    } as UptimeKumaMonitor,
    msg: "[Example Monitor] [🔴 Down] No heartbeat in the time window",
  };
}
