import nodemailer from "nodemailer";

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

      // Check the path for the webhook token
      if (url.pathname === "/webhook") {
        const token = url.searchParams.get("token");
        if (token === creds.webhookToken) {
          console.log("Valid webhook request with token:", token);
          const emailSent = await sendMail(req);
          return new Response("Webhook received", { status: 200 });
        } else {
          console.log("Unauthorized request with token:", token);
          // Return a 401 for an invalid token
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // Return a 400 for any other request
      return new Response(
        `
Bad request

Usage:
- POST /webhook?token=secret-token

Parameters:
- token: The webhook token to authorize the request

Data:
- The request body should be a JSON matching the format of an uptimekuma webhook.

        `,
        { status: 400 }
      );
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
    } else {
      throw new Error("No request body");
    }
  } catch (e) {
    console.error("Invalid JSON data:", e);
    return new Response("Invalid JSON data", { status: 400 });
  }

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
    subject: "Uptimekuma Webhook",
    text: JSON.stringify(data, null, 2),
    html: `
<h1>Uptimekuma Webhook</h1>
<pre>
${JSON.stringify(data, null, 2)}
</pre>
    `,
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
