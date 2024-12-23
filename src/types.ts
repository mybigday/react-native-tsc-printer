export enum ConnectionType {
  USB = 'usb',
  NET = 'net',
  BLUETOOTH = 'bluetooth',
}

export interface Device {
  name: string;
  target: string;
  type: ConnectionType;
}

export enum SensorType {
  Gap = 0,
  BlackLine = 1,
}

export enum CodePage {
  USA = 'USA',
  BRI = 'BRI',
  GER = 'GER',
  FRE = 'FRE',
  DAN = 'DAN',
  ITA = 'ITA',
  SPA = 'SPA',
  SWE = 'SWE',
  SWI = 'SWI',
  CP437 = 'CP437',
  CP737 = 'CP737',
  CP850 = 'CP850',
  CP851 = 'CP851',
  CP852 = 'CP852',
  CP855 = 'CP855',
  CP857 = 'CP857',
  CP860 = 'CP860',
  CP861 = 'CP861',
  CP862 = 'CP862',
  CP863 = 'CP863',
  CP864 = 'CP864',
  CP865 = 'CP865',
  CP866 = 'CP866',
  CP869 = 'CP869',
  CP1250 = 'CP1250',
  CP1251 = 'CP1251',
  CP1252 = 'CP1252',
  CP1253 = 'CP1253',
  CP1254 = 'CP1254',
  CP1255 = 'CP1255',
  CP1256 = 'CP1256',
  CP1257 = 'CP1257',
  CP1258 = 'CP1258',
  CP932 = 'CP932',
  CP936 = 'CP936',
  CP949 = 'CP949',
  CP950 = 'CP950',
  UTF8 = 'UTF-8',
  Latin1 = '8859-1',
  Latin2 = '8859-2',
  Latin3 = '8859-3',
  Baltic = '8859-4',
  Cyrillic = '8859-5',
  Arabic = '8859-6',
  Greek = '8859-7',
  Turkish = '8859-9',
  Latin6 = '8859-10',
  Latin9 = '8859-15',
}

export enum BarcodeType {
  Code128 = '128',
  Code128M = '128M',
  EAN128 = 'EAN128',
  Interleaved2Of5 = '25',
  Interleaved2Of5C = '25C',
  Code39 = '39',
  Code39C = '39C',
  Code93 = '93',
  EAN13 = 'EAN13',
  EAN13Plus2 = 'EAN13+2',
  EAN13Plus5 = 'EAN13+5',
  EAN8 = 'EAN8',
  EAN8Plus2 = 'EAN8+2',
  EAN8Plus5 = 'EAN8+5',
  Codabar = 'CODA',
  Postnet = 'POST',
  UPCA = 'UPCA',
  UPCA2 = 'UPCA+2',
  UPA5 = 'UPA+5',
  UPCE = 'UPCE',
  UPCE2 = 'UPCE+2',
  UPE5 = 'UPE+5',
  MSI = 'MSI',
  MSIC = 'MSIC',
  Plessey = 'PLESSEY',
  CPOST = 'CPOST',
  ITF14 = 'ITF14',
  EAN14 = 'EAN14',
  Code11 = '11',
  Telepen = 'TELEPEN',
  TelepenN = 'TELEPENN',
  Planet = 'PLANET',
  Code49 = 'CODE49',
  DPI = 'DPI',
  DPL = 'DPL',
  Logmars = 'LOGMARS',
}

export enum Font {
  MonotyeCG0 = '0',
  MonotyeCG1 = '1',
  MonotyeCG2 = '2',
  MonotyeCG3 = '3',
  MonotyeCG4 = '4',
  MonotyeCG5 = '5',
  MonotyeCG6 = '6',
  MonotyeCG7 = '7',
  MonotyeCG8 = '8',
  Roman = 'ROMAN.TTF',
  EPL1 = '1.EFT',
  EPL2 = '2.EFT',
  EPL3 = '3.EFT',
  EPL4 = '4.EFT',
  EPL5 = '5.EFT',
  ZPLA = 'A.FNT',
  ZPLB = 'B.FNT',
  ZPLD = 'D.FNT',
  ZPLE8 = 'E8.FNT',
  ZPLF = 'F.FNT',
  ZPLG = 'G.FNT',
  ZPLH8 = 'H8.FNT',
  ZPLGS = 'GS.FNT',
}

export enum TextAlignment {
  Default = 0,
  Left = 1,
  Center = 2,
  Right = 3,
}

export enum QRCodeMode {
  Auto = 'A',
  Manual = 'M',
}

export enum QRCodeModel {
  Model1 = 'M1',
  Model2 = 'M2',
}

export enum QRCodeMask {
  S0 = 'S0',
  S1 = 'S1',
  S2 = 'S2',
  S3 = 'S3',
  S4 = 'S4',
  S5 = 'S5',
  S6 = 'S6',
  S7 = 'S7',
}
