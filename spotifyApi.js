//client id: 52532f24809f42b2aa0c93a180adce29

//secret: c7f4af0fed054f3e9bbe6dceb663fa3a

const SpotifyWebApi = require('spotify-web-api-node');

// Create the api object with the credentials
const spotifyApi = new SpotifyWebApi({
  clientId: '52532f24809f42b2aa0c93a180adce29',
  clientSecret: 'c7f4af0fed054f3e9bbe6dceb663fa3a'
});

// Retrieve an access token.
spotifyApi.clientCredentialsGrant().then(
  async function(data) {
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);

    const {body:{tracks}} = await spotifyApi.searchTracks('Immaterial (Original Mix)');
    //spotifyApi.getAudioFeaturesForTrack('3Qm86XLflmIXVm1wcwkgDK')
    const analysis = await spotifyApi.getAudioFeaturesForTrack('6JejVnKOUzc0x7b9HDQJDM')
    console.log(analysis)
  },
  function(err) {
    console.log('Something went wrong when retrieving an access token', err);
  }
);