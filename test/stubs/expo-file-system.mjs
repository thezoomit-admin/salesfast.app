// In-memory expo-file-system `File` / `Paths` (only what the app uses).
export const disk = new Map();
export const Paths = { document: { uri: 'file:///doc/' } };
export class File {
  constructor(dir, name) {
    this.uri = `${dir.uri}${name}`;
  }
  get exists() {
    return disk.has(this.uri);
  }
  create() {
    if (!disk.has(this.uri)) disk.set(this.uri, '');
  }
  write(text) {
    disk.set(this.uri, text);
  }
  async text() {
    if (!disk.has(this.uri)) throw new Error(`ENOENT ${this.uri}`);
    return disk.get(this.uri);
  }
  delete() {
    disk.delete(this.uri);
  }
}
