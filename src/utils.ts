import { Buffer } from 'buffer';

const CRLF = Buffer.from('\r\n');

type CommandArg = string | number | Buffer;

export const buildCommand = (command: string, ...args: CommandArg[]) => {
  const buffers = [Buffer.from(`${command} `)];
  for (const arg of args) {
    if (Buffer.isBuffer(arg)) {
      buffers.push(arg as Buffer);
    } else {
      buffers.push(Buffer.from(arg.toString()));
    }
  }
  buffers.push(CRLF);
  // @ts-ignore TS2345
  return Buffer.concat(buffers);
};

export const quote = (str: string) => `"${str.replace(/"/g, '""')}"`;
