const NodeID3 = require("node-id3");
const promisify = require("util").promisify;
const mp3Duration = promisify(require("mp3-duration"));
const path = require("path");
const fs = require("fs");

fs.readFileAsync = promisify(fs.readFile);
fs.accessAsync = promisify(fs.access);
fs.mkdirAsync = promisify(fs.mkdir);
fs.writeFileAsync = promisify(fs.writeFile);

class TagApi {
  constructor(filename, dir = __dirname) {
    this.filename = filename;
    this.extname = path.extname(filename);
    this.dir = dir;
    this.path = path.join(dir, filename);
    this.tags = {};
    this.buffer = Buffer.from([]);
    this.durationMs = 0;
  }
  async readFile() {
    this.buffer = await fs.readFileAsync(this.path);
    this.durationMs = (await mp3Duration(this.buffer)) * 1000;
    this.tags = await NodeID3.read(this.buffer);
    this.name = `${this.tags.artist} - ${this.tags.title}`;
  }
  async updateTags(tags) {
    if (!Object.keys(tags).length) {
      throw new Error("Invalid tags object passed");
    }
    this.buffer = NodeID3.update(tags, this.buffer);
    // console.log(`Tags written to buffer: ${JSON.stringify(tags)}`);
  }

  async writeFile(dir = this.dir, filename = this.filename) {
    try {
      await fs.accessAsync(dir, fs.constants.O_DIRECTORY);
      if (!path.extname(filename).includes(".")) {
        //Дописываем расширение, если не указано
        filename += this.extname;
      }
      const filePath = path.join(dir, filename);
      await fs.writeFileAsync(filePath, this.buffer);
      return filePath;
    } catch (err) {
      // console.log(err.toString());
      // console.log(`Dir ${dir} does not exist. Creating...`);
      //Создаем директорию, если её нет и перезапускаем функцию
      await fs.mkdirAsync(dir, { recursive: true });
      return this.writeFile(dir, filename);
    }
  }
}

module.exports = TagApi;
