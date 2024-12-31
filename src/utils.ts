import { Buffer } from 'buffer';

const CRLF = Buffer.from('\r\n');

const COMMA = Buffer.from(',');

type CommandArg = string | number | Buffer;

export const buildCommand = (command: string, ...args: CommandArg[]) => {
  const buffers = [Buffer.from(`${command} `)];
  args.forEach((arg, index) => {
    if (index > 0) {
      buffers.push(COMMA);
    }
    if (Buffer.isBuffer(arg)) {
      buffers.push(arg as Buffer);
    } else {
      buffers.push(Buffer.from(String(arg)));
    }
  });
  buffers.push(CRLF);
  // @ts-ignore TS2345
  return Buffer.concat(buffers);
};

export const quote = (str: string | Buffer): Buffer => {
  if (typeof str === 'string') {
    return Buffer.from(`"${str.replace(/"/g, '""')}"`);
  }
  const quote = Buffer.from('"');
  // @ts-ignore TS2345
  return Buffer.concat([quote, str, quote]);
};
