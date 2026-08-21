import net from "node:net";
import tls from "node:tls";
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

async function command(socket: net.Socket | tls.TLSSocket, line: string, expected: number[]) {
  socket.write(`${line}\r\n`);
  const response = await readLine(socket);
  const code = Number(response.slice(0, 3));
  if (!expected.includes(code)) throw new Error(`SMTP command failed: ${line} -> ${response}`);
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

export async function sendMail({ to, subject, text, html }: MailMessage) {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    console.info(`[mail:dev] To: ${to}\nSubject: ${subject}\n${text}`);
    return { delivered: false, mode: "console" };
  }

  const from = config.mailFrom;
  const fromEmail = encodeAddress(from);
  const socket = net.connect(config.smtpPort, config.smtpHost);
  await readLine(socket);
  await command(socket, `EHLO ${config.smtpHost}`, [250]);
  await command(socket, "STARTTLS", [220]);
  const secure = tls.connect({ socket, servername: config.smtpHost });
  await command(secure, `EHLO ${config.smtpHost}`, [250]);
  await command(secure, "AUTH LOGIN", [334]);
  await command(secure, Buffer.from(config.smtpUser).toString("base64"), [334]);
  await command(secure, Buffer.from(config.smtpPass).toString("base64"), [235]);
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
  return { delivered: true, mode: "smtp" };
}
