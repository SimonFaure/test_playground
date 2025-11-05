import { WorkingEnv, InitWorkingEnv, SendWakeup, SendReadRequest, SerialRead, SerialPeek, ReadOneStationFrame, checkCRC, GetSI9DataExt, sleep, retrieveUSBPorts } from '../lib/lib.js';

export interface USBPort {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
}

export interface CardData {
  id: number;
  series: number;
  start?: {
    code: number;
    time: string;
  };
  end?: {
    code: number;
    time: string;
  };
  check?: {
    code: number;
    time: string;
  };
  nbPunch: number;
  punches: Array<{
    code: number;
    time: string;
  }>;
}

export interface StationData {
  stationNumber: number;
  stationMode: number;
  extended: boolean;
  handShake: boolean;
  autoSend: boolean;
  radioChannel: boolean | number;
}

export class USBReaderService {
  private isRunning = false;
  private onCardDetected?: (card: CardData) => void;
  private onCardRemoved?: () => void;
  private onStationsDetected?: (stations: StationData[]) => void;

  isElectron(): boolean {
    return typeof window !== 'undefined' && window.require !== undefined;
  }

  async getAvailablePorts(): Promise<USBPort[]> {
    if (!this.isElectron()) {
      console.warn('USB functionality only available in Electron');
      return [];
    }
    try {
      await retrieveUSBPorts();
      return WorkingEnv.ports || [];
    } catch (error) {
      console.error('Error getting USB ports:', error);
      return [];
    }
  }

  async initializePort(portPath: string): Promise<boolean> {
    if (!this.isElectron()) {
      console.warn('USB functionality only available in Electron');
      return false;
    }
    try {
      InitWorkingEnv(portPath);
      await sleep(100);
      return true;
    } catch (error) {
      console.error('Error initializing port:', error);
      return false;
    }
  }

  setCardDetectedCallback(callback: (card: CardData) => void) {
    this.onCardDetected = callback;
  }

  setCardRemovedCallback(callback: () => void) {
    this.onCardRemoved = callback;
  }

  setStationsDetectedCallback(callback: (stations: StationData[]) => void) {
    this.onStationsDetected = callback;
  }

  async start() {
    if (!this.isElectron()) {
      console.warn('USB functionality only available in Electron');
      return;
    }
    if (this.isRunning) {
      console.warn('USB Reader already running');
      return;
    }

    this.isRunning = true;
    await this.readLoop();
  }

  stop() {
    this.isRunning = false;
  }

  private async readLoop() {
    while (this.isRunning) {
      try {
        const stations: StationData[] = [];

        console.log('Sending wakeup message...');
        await SendWakeup();
        await sleep(700);

        console.log('Waiting for peripheral response...');
        await SerialRead(9);
        console.log('Connection established');

        console.log('Retrieving infos from peripheral...');
        await SendReadRequest();
        await sleep(100);

        let k = 7;
        while (k) {
          k = 7;
          let buff = Buffer.alloc(0);

          while (k && (buff = await SerialPeek(3)) && (await SerialPeek(buff[2] + 6)).length !== buff[2] + 6) {
            await sleep(100);
            k--;
          }

          let resp = null;
          if (k) {
            console.log('Processing station data...');
            resp = await ReadOneStationFrame();
            if (resp) stations.push(resp.toJSON());
          } else {
            console.log('Finished reading stations');
          }
        }

        if (stations.length > 0 && this.onStationsDetected) {
          this.onStationsDetected(stations);
        }

        while (this.isRunning) {
          let buff = await SerialPeek(12);

          if (buff.length === 12) {
            buff = await SerialRead(12);

            if (buff[1] === 0xE8 && checkCRC(buff, 1)) {
              console.log('Card detected...', buff.toString('hex'));

              const cardData = await this.readCardData();

              if (cardData && this.onCardDetected) {
                this.onCardDetected(cardData);
              }

              do {
                buff = await SerialRead(12);
              } while (!checkCRC(buff, 1));

              console.log('Card removed...', buff.toString('hex'));

              if (this.onCardRemoved) {
                this.onCardRemoved();
              }
            }
          }

          await sleep(500);
        }

        await sleep(5000);
      } catch (error) {
        console.error('Error in read loop:', error);
        await sleep(2000);
      }
    }
  }

  private async readCardData(): Promise<CardData | null> {
    try {
      const cardDataPromise = new Promise<CardData | null>((resolve) => {
        const originalLog = console.log;
        let capturedCard: CardData | null = null;

        console.log = (...args: any[]) => {
          if (args[0] === 'card : ' && args[1]) {
            capturedCard = args[1] as CardData;
          }
          originalLog(...args);
        };

        GetSI9DataExt().then(() => {
          console.log = originalLog;
          resolve(capturedCard);
        }).catch((error) => {
          console.log = originalLog;
          console.error('Error reading card data:', error);
          resolve(null);
        });
      });

      return await cardDataPromise;
    } catch (error) {
      console.error('Error reading card data:', error);
      return null;
    }
  }
}

export const usbReaderService = new USBReaderService();
