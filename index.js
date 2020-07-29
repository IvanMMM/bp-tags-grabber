const path = require("path");
const fs = require("fs");
const analyzer = require("./analyzer");
const Bluebird = require("bluebird");

(async () => {
  let [scriptDir, fullPath, workingDir] = process.argv;
  if (!workingDir) {
    workingDir = __dirname;
  }
  const filenames = fs
    .readdirSync(workingDir)
    .filter(name => path.extname(name) === ".mp3");
  const date = new Date();
  await Bluebird.map(
    filenames,
    async filename => {
      try {
        await analyzer({
          filename,
          dir: workingDir,
          saveToDir: path.join(workingDir, "Tagged", date.toISOString()),
          subfolders: true
        });
        console.log(`File ${filename} reworked and saved`);
      } catch (err) {
        console.error(
          `File ${filename} got and error while processing: ${err.toString()}`
        );
      }
    },
    { concurrency: 1 }
  );
})();
