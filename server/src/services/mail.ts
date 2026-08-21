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

function encodeAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return match?.[1] ?? value;
}

export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
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
  const body = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    text.replace(/^\./gm, ".."),
    "."
  ].join("\r\n");
  secure.write(`${body}\r\n`);
  await readLine(secure);
  await command(secure, "QUIT", [221]);
  secure.end();
  return { delivered: true, mode: "smtp" };
}
