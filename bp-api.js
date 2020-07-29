const got = require("got");

async function autocomplete(query) {
  //https://oauth-api.beatport.com/catalog/3/autocomplete?sourceType=beatportproweb&perPage=10&query=Chinese%20Radio

  return (await got.get(
    "https://oauth-api.beatport.com/catalog/3/autocomplete",
    {
      searchParams: {
        sourceType: "beatportproweb",
        perPage: 10,
        query
      },
      responseType: "json"
    }
  )).body.results;
}

async function getTrackInfo(q) {
  //https://www.beatport.com/search?q=Chinese+Radio&_pjax=%23pjax-inner-wrapper

  const body = (await got.get("https://www.beatport.com/search", {
    searchParams: {
      q,
      _pjax: "%23pjax-inner-wrapper"
    }
  })).body;
  const result = JSON.parse(/window\.Playables = ({.*?});/.exec(body)[1]);
  return result;
}

module.exports = {
  autocomplete,
  getTrackInfo
};
