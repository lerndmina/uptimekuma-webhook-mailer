# Uptime Kuma Email Notifier

A lightweight email notification service for Uptime Kuma monitoring webhooks. Sends formatted HTML and plain text emails when monitors change status.

## Requirements

- Bun runtime
- SMTP email server credentials
- Uptime Kuma instance

## Installation

```bash
# Clone repository
git clone https://github.com/lerndmina/uptimekuma-webhook-mailer.git
cd uptimekuma-webhook-mailer

# Install dependencies
bun install
```

## Configuration

Create a `.env` file with the following variables:

```env
EMAIL_USER=name@example.com,email2@example.com
EMAIL_FROM=name@example.com    # Optional, defaults to EMAIL_USER can be an email sender string like `"Uptime Kuma" <name@example.com>`
EMAIL_TO=recipient@example.com
EMAIL_PASS=your-smtp-password
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587                       # Optional, defaults to 587
WEBHOOK_TOKEN=your-secret-token
```

## Usage

### Running Locally

```bash
bun run dev
```

### Docker Deployment

```bash
# Build container
docker build -t uptime-mailer .

# Run container
docker run -d \
  --name uptime-mailer \
  -p 8080:8080 \
  --env-file .env \
  uptime-mailer
```

### Uptime Kuma Setup

1. Go to your Uptime Kuma dashboard
2. Add new notification
3. Select "Webhook" as type
4. Set URL to: `http://your-server:8080/webhook?token=your-secret-token`
5. Test notification

## API

### POST /webhook

Accepts Uptime Kuma webhook payloads:

```json
{
  "heartbeat": {
    "status": 0,
    "msg": "Monitor is down"
    // ... other fields
  },
  "monitor": {
    "name": "My Monitor",
    "url": "https://example.com"
    // ... other fields
  }
}
```

### Security

- Always use HTTPS in production
- Keep webhook token secret
- Use strong SMTP credentials
- Store .env file securely

## Development

```bash
# Run with hot reload
bun run dev

# Format code
bun run format

# Type check
bun run typecheck
```