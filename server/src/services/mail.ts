import net from "node:net";
import tls from "node:tls";
import dns from "node:dns";
import { config } from "../config.js";

function readLine(socket: net.Socket | tls.TLSSocket) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      if (/\r?\n$/.test(buffer) && !/^\d{3}-/m.test(buffer.split(/\r?\n/).filter(Boolean).at(-1) ?? "")) {
        socket.off("data", onData);
        resolve(buffer);
      }
    };
    socket.on("data", onData);
    socket.once("error", reject);
  });
}

async function command(socket: net.Socket | tls.TLSSocket, line: string, expected: number[], label = line) {
  socket.write(`${line}\r\n`);
  const response = await readLine(socket);
  const code = Number(response.slice(0, 3));
  if (!expected.includes(code)) throw new Error(`SMTP command failed at ${label}: ${response}`);
  return response;
}

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function encodeAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return match?.[1] ?? value;
}

function encodeHeader(value: string) {
  return value.replace(/\r?\n/g, " ");
}

function encodeBody(value: string) {
  return value.replace(/^\./gm, "..");
}

const lookupIpv4: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, family: 4 }, callback);
};

async function sendWithBrevo({ to, subject, text, html }: MailMessage) {
  if (!config.brevoApiKey) return undefined;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": config.brevoApiKey,
      "Content-Type": "application/json",
      "User-Agent": "teamflow-api",
    },
    body: JSON.stringify({
      sender: { email: config.brevoFromEmail, name: config.brevoFromName },
      to: [{ email: to }],
      subject,
      text,
      htmlContent: html ?? text.replace(/\n/g, "<br>"),
      textContent: text,
    }),
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(`Brevo email failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  console.info(`[mail] delivered via Brevo to ${to}: ${payload?.messageId ?? "accepted"}`);
  return { delivered: true, mode: "brevo", id: payload?.messageId };
}

export async function sendMail({ to, subject, text, html }: MailMessage) {
  const brevoResult = await sendWithBrevo({ to, subject, text, html });
  if (brevoResult) return brevoResult;

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    console.info(`[mail:dev] To: ${to}\nSubject: ${subject}\n${text}`);
    return { delivered: false, mode: "console" };
  }

  const from = config.mailFrom;
  const fromEmail = encodeAddress(from);
  console.info(`[mail] sending via ${config.smtpHost}:${config.smtpPort} from ${fromEmail} to ${to}`);
  const socket = net.connect({ port: config.smtpPort, host: config.smtpHost, lookup: lookupIpv4 });
  await readLine(socket);
  await command(socket, `EHLO ${config.smtpHost}`, [250]);
  await command(socket, "STARTTLS", [220]);
  const secure = tls.connect({ socket, servername: config.smtpHost });
  await command(secure, `EHLO ${config.smtpHost}`, [250]);
  await command(secure, "AUTH LOGIN", [334]);
  await command(secure, Buffer.from(config.smtpUser).toString("base64"), [334], "AUTH username");
  await command(secure, Buffer.from(config.smtpPass).toString("base64"), [235], "AUTH password");
  await command(secure, `MAIL FROM:<${fromEmail}>`, [250]);
  await command(secure, `RCPT TO:<${to}>`, [250, 251]);
  await command(secure, "DATA", [354]);
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
  ];
  const body = html
    ? [
        ...headers,
        "Content-Type: multipart/alternative; boundary=teamflow-email-boundary",
        "",
        "--teamflow-email-boundary",
        "Content-Type: text/plain; charset=utf-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        encodeBody(text),
        "--teamflow-email-boundary",
        "Content-Type: text/html; charset=utf-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        encodeBody(html),
        "--teamflow-email-boundary--",
        "."
      ].join("\r\n")
    : [
        ...headers,
        "Content-Type: text/plain; charset=utf-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        encodeBody(text),
        "."
      ].join("\r\n");
  secure.write(`${body}\r\n`);
  const dataResponse = await readLine(secure);
  const dataCode = Number(dataResponse.slice(0, 3));
  if (dataCode !== 250) throw new Error(`SMTP message rejected: ${dataResponse}`);
  await command(secure, "QUIT", [221]);
  secure.end();
  console.info(`[mail] delivered to SMTP server for ${to}: ${dataResponse.trim()}`);
  return { delivered: true, mode: "smtp" };
}
