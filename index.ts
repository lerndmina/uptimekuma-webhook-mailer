import nodemailer from "nodemailer";
import { isUptimeKumaWebhook, validateMultipleEmails, validateSingleEmail, type CredentialConfig, type CredentialDefinition, type UptimeKumaMonitor, type UptimeKumaWebhook } from "./types-utils";
import fs from "fs";
import path from "path";
import { Liquid } from "liquidjs";
import { log } from "console";

let defaultedEnvs: string[] = [];
function getEnvValue(config: CredentialConfig) {
  if (config.env) {
    // If enviroment variable has a validator ? save result of : otherwise assume valid and contiunue
    const [valid, message] = config.validator ? config.validator(config.env) : [true, ""];
    if (valid) {
      return config.env;
    }
    throw new Error(`Invalid credential: ${config.name} is invalid. "${message}"\n\nThe application will now exit.`);
  }

  if (!config.env && config.optional && config.default) {
    defaultedEnvs.push(config.name);
    return config.default;
  }
  throw new Error(`Missing credential: env ${config.name} is undefined. Here's a hint: ${config.help}.\n\nThe application will now exit.`);
}

const credentialDefs: CredentialDefinition = {
  user: {
    env: process.env.EMAIL_USER,
    name: "EMAIL_USER",
    help: "The SMTP user is required for authentication with the SMTP server",
  },
  to: {
    env: process.env.EMAIL_TO,
    name: "EMAIL_TO",
    help: "Recipient email address is required so we know where to send the email",
    validator: (value) => validateMultipleEmails(value),
  },
  from: {
    env: process.env.EMAIL_FROM,
    name: "EMAIL_FROM",
    help: "Sender email address is only required if the smtp user is not the sender",
    optional: true,
    default: process.env.EMAIL_USER!,
    validator: (value) => validateSingleEmail(value),
  },
  pass: {
    env: process.env.EMAIL_PASS,
    name: "EMAIL_PASS",
    help: "SMTP password is required... for security reasons, you know? :)",
  },
  host: {
    env: process.env.EMAIL_HOST,
    name: "EMAIL_HOST",
    help: "SMTP host server is required so we know where to connect",
  },
  port: {
    env: process.env.EMAIL_PORT,
    name: "EMAIL_PORT",
    help: "SMTP port is required",
    default: "587",
    optional: true,
    validator: (value) => {
      // Check if string contains only digits
      if (!/^\d+$/.test(value)) {
        return [false, "Port must be a numeric value"];
      }
      const port = parseInt(value);
      return [port > 0 && port <= 65535, "Port must be between 1 and 65535 (common SMTP ports: 25, 465, 587, 2525), check your SMTP provider for the correct port."];
    },
  },
  webhookToken: {
    env: process.env.WEBHOOK_TOKEN,
    name: "WEBHOOK_TOKEN",
    help: "Webhook token is required for security",
    validator: (value) => {
      if (value.length < 8) {
        return [false, "Webhook token must be at least 8 characters long"];
      }
      return [true, ""];
    },
  },
  baseUrl: {
    env: process.env.BASE_URL,
    name: "BASE_URL",
    help: "Base URL for webhook endpoints",
    optional: true,
    default: "http://localhost:8080",
  },
};

const creds = Object.fromEntries(Object.entries(credentialDefs).map(([key, config]) => [key, getEnvValue(config)]));

function main() {
  console.log("\n\nHello 👋 We're just getting started...\n\n");

  defaultedEnvs.length > 0 &&
    console.log(
      "Defaulted environment variables:",
      defaultedEnvs,
      "\n",
      "The program will continue, but it's recommended to set the environment variable(s), and may cause unexpected behavior.",
      "\n\n"
    );

  console.log(new Date(), "Starting email server with credentials: ", creds);
  console.log("Webhook token:", creds.webhookToken);
  console.log(`You can build a URL like this to send a webhook request: ${creds.baseUrl}/webhook?token=${creds.webhookToken}`);

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
  let valid;
  try {
    if (req.body) {
      data = await req.json();
      const valid = isUptimeKumaWebhook(data);
      if (!valid) {
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

  const extra_inboxes = req.headers.get("extra_inboxes");
  if (extra_inboxes) {
    creds.to += `,${extra_inboxes}`;
  }

  // Handle comma-seperated to emails
  const sentEmails = [];
  if (creds.to && creds.to.includes(",")) {
    const emails = creds.to.split(",").map((email) => email.trim());
    for (const email of emails) {
      creds.to = email;
      const response = await sendEmail(data, valid);
      sentEmails.push(response);
    }
  } else {
    const response = await sendEmail(data, valid);
    return response;
  }
  console.log(`Sent emails to ${sentEmails.length} recipients.`);
  return new Response(`Notification Emails sent to ${sentEmails.length} recipients.`, { status: 200 });
}

async function sendEmail(data: UptimeKumaWebhook, valid: boolean | "TESTING" | undefined): Promise<Response> {
  // Request is valid, send the email
  const transporter = nodemailer.createTransport({
    host: creds.host,
    port: parseInt(creds.port),
    secure: creds.port === "465",
    auth: {
      user: creds.user,
      pass: creds.pass,
    },
  });

  const mailOptions = {
    from: creds.from,
    to: creds.to,
    subject: data.msg,
    text: valid === "TESTING" ? getPlainTextEmail(data) : "Testing email, no data provided",
    html: valid === "TESTING" ? await getEmailTextFromFile(data) : "<h1>Testing email, no data provided</h1>",
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
