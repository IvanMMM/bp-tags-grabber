const path = require("path");
const fs = require("fs");
const analyzer = require("./analyzer");
const Bluebird = require("bluebird");
const unlinkAsync = Bluebird.promisify(fs.unlink);

//https://www.npmjs.com/package/seratojs
//https://developer.spotify.com/documentation/web-api/reference/tracks/get-audio-features/

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
          saveToDir: path.join(workingDir, "Tagged"),
          subfolders: true
        });
        console.log(`File ${filename} reworked and saved. Original file removed.`);
        await unlinkAsync(path.join(workingDir,filename))
      } catch (err) {
        // fs.createReadStream(path.join(workingDir, filename)).pipe(
        //   fs.createWriteStream(
        //     path.join(
        //       workingDir,
        //       "Tagged",
        //       date.toISOString(),
        //       "Unknown",
        //       filename
        //     )
        //   )
        // );
        //
        console.error(
          `File ${filename} got and error while processing: ${err.toString()}`
        );
      }
    },
    { concurrency: 100 }
  );
})();
