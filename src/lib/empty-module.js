export default {};

export const SerialPort = class {
  constructor() {
    this.isOpen = false;
  }

  on(event, callback) {
    return this;
  }

  write(data, callback) {
    if (callback) callback();
    return this;
  }

  close(callback) {
    if (callback) callback();
    return this;
  }

  open(callback) {
    if (callback) callback();
    return this;
  }

  static async list() {
    return [];
  }
};
