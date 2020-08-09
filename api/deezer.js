const crypto = require('crypto');
const { promisify } = require('util');
const stream = require('stream');
const got = require('got');
const path = require('path');
const fs = require('fs');
const { CookieJar } = require('tough-cookie');

const pipeline = promisify(stream.pipeline);

const API_URL = 'http://www.deezer.com/ajax/gw-light.php';

class DeezerApi {
  constructor(arlToken) {
    if (!arlToken) {
      throw new Error('Invalid token provided');
    }
    this.arlToken = arlToken;
    this.cookieJar = new CookieJar();
    this.setCookie = promisify(this.cookieJar.setCookie.bind(this.cookieJar));
    this.setCookie(`arl=${arlToken}`, API_URL);
  }

  //STATICS
  static getTrackStreamUrl(trackId, md5Origin, mediaVersion, format) {
    const md5OriginBuffer = Buffer.from(md5Origin);
    const formatBuffer = Buffer.from(format.toString());
    const trackIdBuffer = Buffer.from(trackId.toString());
    const mediaVersionBuffer = Buffer.from(mediaVersion.toString());
    const dividerBuffer = Buffer.from('a4', 'hex');
    const urlPartBuffer = Buffer.concat([
      md5OriginBuffer,
      dividerBuffer,
      formatBuffer,
      dividerBuffer,
      trackIdBuffer,
      dividerBuffer,
      mediaVersionBuffer
    ]);
    const md5Val = crypto
      .createHash('md5')
      .update(urlPartBuffer)
      .digest('hex');
    const step2 = Buffer.concat([
      Buffer.from(md5Val),
      dividerBuffer,
      urlPartBuffer,
      dividerBuffer,
      Buffer.alloc(16, Buffer.from('10', 'hex'))
    ]);

    const aesKey = Buffer.from('jo6aey6haid2Teih');
    const urlPartCrypted = crypto.createCipheriv('aes-128-ecb', aesKey, '');
    urlPartCrypted.setAutoPadding(false);
    let url = urlPartCrypted.update(step2).toString('hex');
    url += urlPartCrypted.final().toString('hex');

    return `https://e-cdns-proxy-${md5Origin[0]}.dzcdn.net/mobile/1/${url}`;
  }

  static async downloadFileFromUrl(downloadUrl, dir, filename, ext) {
    console.log(`Downloading from url: ${downloadUrl}`);
    const filePath = path.join(dir, filename) + '.' + ext;
    /*
        def stream_track(self, track_id, url, stream):
        try:
            request = requests.get(url, headers=self.http_headers, stream=True, timeout=30, verify=False)
        except:
            time.sleep(2)
            return self.stream_track(track_id, url, stream)
        request.raise_for_status()
        blowfish_key = str.encode(self._get_blowfish_key(str(track_id)))
        i = 0
        for chunk in request.iter_content(2048):
            if (i % 3) == 0 and len(chunk) == 2048:
                chunk = Blowfish.new(blowfish_key, Blowfish.MODE_CBC, b"\x00\x01\x02\x03\x04\x05\x06\x07").decrypt(
                    chunk)
            stream.write(chunk)
            i += 1

    */
    await pipeline(
      got.stream(downloadUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36'
        }
      }),
      fs.createWriteStream(filePath, { encoding: 'binary' })
    );


    // const b = await got.get(downloadUrl,{responseType:'buffer'});
    // console.log(b)
    // fs.writeFileSync(filePath,b.body)
  }

  //REQUESTS
  async _makePrivateApiRequest({ method, ...query }, json = {}, url = API_URL) {
    if (!method) {
      throw new Error('Invalid method passed');
    }
    const { body } = await got.post({
      url,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36'
      },
      searchParams: {
        api_version: '1.0',
        input: 3,
        method,
        ...query
      },
      json,
      responseType: 'json',
      cookieJar: this.cookieJar
    });
    if ((Array.isArray(body.error) && body.error.length) || Object.keys(body.error).length) {
      throw new Error(JSON.stringify(body.error));
    }
    return body.results;
  }

  async _makePublicApiRequest({ path, id, method = 'get' }) {
    const { body } = await got({
      method,
      url: `https://api.deezer.com/${path}/${id}  `,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36'
      },
      responseType: 'json',
      cookieJar: this.cookieJar
    });
    return body;
  }

  //PRIVATE
  async getUserData() {
    //http://www.deezer.com/ajax/gw-light.php?api_version=1.0&api_token=null&input=3&method=deezer.getUserData
    const result = await this._makePrivateApiRequest({
      method: 'deezer.getUserData',
      api_token: null
    });
    this.userToken = result.USER_TOKEN;
    this.playerToken = result.PLAYER_TOKEN;
    this.apiToken = result.checkForm;
    return result;
  }

  async getTrackData(trackId) {
    //http://www.deezer.com/ajax/gw-light.php?api_version=1.0&api_token=8eL0qmY0_AiKzuziFPzh.xEVBmmxMu~Q&input=3&method=deezer.pageTrack
    const result = await this._makePrivateApiRequest(
      {
        method: 'deezer.pageTrack',
        api_token: this.apiToken
      },
      { sng_id: trackId }
    );
    return result;
  }

  async getTrackMeta(trackId) {
    //https://api.deezer.com/1.0/gateway.php?api_key=4VCYIJUCDLOUELGD1V8WBVYBNVDYOXEWSLLZDONGBBDFVXTZJRXPR29JRLQFO6ZE&sid=fr5b89f11637c1709a7572f65a832ff0479bcf2a&input=3&output=3&method=song_getData
    const cookies = this.cookieJar.getCookiesSync(API_URL);
    const options = {
      method: 'song_getData',
      api_key: '4VCYIJUCDLOUELGD1V8WBVYBNVDYOXEWSLLZDONGBBDFVXTZJRXPR29JRLQFO6ZE',
      output: 3
    };
    cookies.forEach(cookie => {
      if (cookie.key === 'sid') {
        options.sid = cookie.value;
      }
    });
    const result = await this._makePrivateApiRequest(
      options,
      { sng_id: trackId },
      'https://api.deezer.com/1.0/gateway.php'
    );
    return result;
  }

  async getAlbumData(albumId) {
    //http://www.deezer.com/ajax/gw-light.php?api_version=1.0&api_token=8eL0qmY0_AiKzuziFPzh.xEVBmmxMu~Q&input=3&method=deezer.pageTrack
    const result = await this._makePrivateApiRequest(
      {
        method: 'album.getData',
        api_token: this.apiToken
      },
      { sng_id: albumId }
    );
    return result;
  }

  //PUBLIC
  async getTrackPublicData(trackId) {
    //https://api.deezer.com/track/663268112
    return await this._makePublicApiRequest({ path: 'track', id: trackId });
  }

  async getTrackPublicData(albumId) {
    //https://api.deezer.com/album/93200812
    return await this._makePublicApiRequest({ path: 'album', id: albumId });
  }
}

(async () => {
  const deezer = new DeezerApi(
    '64784eaf2ff5ed91563ecdea5b2ac423c4c9b7a706664c5408e9b9861f8c375f1028198dac8ab637924c43f4a8386787517c1d4f568cc9ae375620754f252a1d8b7ee7cf2f31c968ba7db42c55c4b9a88370fd95665eacb2b17d15368b336f05'
  );
  await deezer.getUserData();
  //https://www.deezer.com/track/74528880?utm_source=deezer&utm_content=track-74528880&utm_term=3820961462_1596460397&utm_medium=web
  // await deezer.getTrackData(74528880);
  // await deezer.getTrackData(74528880);
  const trackMeta = await deezer.getTrackMeta(74528880);
  const {
    MD5_ORIGIN,
    ARTISTS,
    DURATION,
    ISRC,
    SNG_TITLE,
    FILESIZE_MP3_64,
    FILESIZE_MP3_128,
    FILESIZE_MP3_256,
    FILESIZE_MP3_320,
    FILESIZE_FLAC,
    FILESIZE,
    MEDIA_VERSION
  } = trackMeta;
  // const downloadUrl = DeezerApi.getTrackStreamUrl(663268112, 'd4ccbe37766e444e98fe9c9cdf8ff6f1', 4, 3);
  // console.log(downloadUrl);
  const downloadUrl =
    'https://e-cdns-proxy-d.dzcdn.net/mobile/1/42bd4276aaa9de8b78bdce7555c3e3bcb4012de993b8a41e74d15221522931f8623329a0924dc167a039473b7a64091e75f056a85f637b6847f626f0b67fc196dd48589a3d8259f4eb71a34ff257c6dc3d0d871c865d5449ab015558f784802f';
  await DeezerApi.downloadFileFromUrl(downloadUrl, '/Users/ivan/Music/', 'testDownload', 'mp3');
})();
