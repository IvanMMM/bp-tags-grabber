const bpApi = require("./bp-api");
const TagsApi = require("./tagWriter");
const ss = require("string-similarity");
const path = require("path");

async function rewriteTags({
  filename,
  dir = __dirname,
  saveToDir = __dirname,
  subfolders = false
}) {
  //Читаем локальный файл
  const file = new TagsApi(filename, dir);
  await file.readFile();
  console.log(`Checking for ${filename}...`);

  //Делаем запрос к beatport
  const { tracks } = await bpApi.getTrackInfo(file.name);
  const matchingTracks = tracks
    //По артисту
    .filter(track => {
      const match = ss.findBestMatch(
        file.tags.artist.toLowerCase(),
        track.artists.map(artist => artist.name.toLowerCase())
      );
      return match.bestMatch.rating > 0.9;
    })
    //Проверяем совпадение по продолжительности
    .filter(track => {
      const diff = relDiff(track.duration.milliseconds, file.durationMs);
      return diff < 0.05;
    })
    //По имени
    .filter(track => {
      const match = ss.compareTwoStrings(
        file.tags.title.toLowerCase(),
        track.name.toLowerCase()
      );
      return match > 0.5;
    });

  //Найден один единстенный трэк, берем данные из его описания и пишем в теги
  let match;
  if (matchingTracks.length !== 1) {
    if (matchingTracks.length === 0) {
      throw new Error(`Track ${file.name} is not found at database`);
    } else {
      console.log(
        `Track ${file.name} has too many matches in database (${matchingTracks.length}), but it's probably one we are looking for`
      );
      console.log(JSON.stringify(matchingTracks));
      match = matchingTracks[0];
    }
  } else {
    console.log(`Match found! Writing tags...`);
    match = matchingTracks[0];
  }
  const tags = {
    artist: match.artists.map(artist => artist.name).join(", "),
    title: match.title,
    bpm: match.bpm,
    date: match.date.published,
    genre: match.genres.map(genre => genre.name).join(", ").replace('/','|'),
    initialKey: match.key,
    album: match.release.name
    //remixArtist
  };
  const newName = `${tags.artist} - ${tags.title}${file.extname}`;
  await file.updateTags(tags);
  await file.writeFile(
    subfolders ? path.join(saveToDir, tags.genre) : saveToDir,
    newName
  );
}

function relDiff(a, b) {
  return 100 * Math.abs((a - b) / ((a + b) / 2));
}

module.exports = rewriteTags;
