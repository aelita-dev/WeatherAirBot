const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
require("dotenv").config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const { WEATHER_API_KEY } = process.env;
const { AIR_API_KEY } = process.env;
const { FORECAST_API_KEY } = process.env;

const GEO_CODING_URL = `http://api.openweathermap.org/geo/1.0/direct`;
const CURRENT_WEATHER_URL = `https://api.openweathermap.org/data/2.5/weather`;
const FORECAST_WEATHER_URL = `https://api.weatherbit.io/v2.0/forecast/daily`;
const AIR_QUALITY_URL = `http://api.airvisual.com/v2/nearest_city`;


const bot = new Telegraf(BOT_TOKEN);


bot.start((ctx) =>
  ctx.reply("Welcome to a Weather Air Bot! \nSend me your Location")
);


// User Location History
let userLocations = {}

// Current Location State 
let location;


// Location determination
bot.on("message", async (ctx) => {
    
    try {
        if (ctx.message.location) {
            location = ctx.message.location;
        
        } else {
            let locationAsText = ctx.update.message.text.replaceAll(' ', '');
            const geoResult = await axios.get(`${GEO_CODING_URL}?q=${locationAsText}&appid=${WEATHER_API_KEY}`);
        
            if (!geoResult.data || geoResult.data.length === 0) {
                throw new Error('The coordinates of the specified location could not be found.');
            }
        
            location = {
                latitude: geoResult.data[0].lat, 
                longitude: geoResult.data[0].lon
            }
        }
        console.log(location);
    
        ctx.reply (
            `Your coordinates: [${location.latitude}, ${location.longitude}]. \nSelect an action:`,
            Markup.inlineKeyboard([
                [Markup.button.callback('Current weather', 'current')],
                [Markup.button.callback('Forecast for 7 days', 'forecast')]
            ])
        );
    
    } catch (error) {
        console.error('Error when receiving location data:', error.message);
        ctx.reply('This location could not be processed. Please try again.');
    }
    
})

    
// Response Processing for Current
bot.action('current', async (ctx) => {
    const weatherResponse = await axios.get(`${CURRENT_WEATHER_URL}?lat=${location.latitude}&lon=${location.longitude}&appid=${WEATHER_API_KEY}`);
    const airQualityResponse = await axios.get(`${AIR_QUALITY_URL}?lat=${location.latitude}&lon=${location.longitude}&key=${AIR_API_KEY}`);
    let celsius = weatherResponse.data.main.temp - 273.15;

    ctx.reply(
      `Country: ${airQualityResponse.data.data.country} \n
City/Region: ${weatherResponse.data.name} \n
Temperature: ${parseInt(celsius)} °C / ${parseInt(1.8 * celsius + 32)} °F \n
Weather: ${weatherResponse.data.weather[0].description} \n
Air quality: ${airQualityResponse.data.data.current.pollution.aqius}`
    );
})


// Response Processing for Forecast
bot.action('forecast', async ctx => {
    try {
        if(location && location.latitude && location.longitude) {
            const forecastResponse = await axios.get(`${FORECAST_WEATHER_URL}?lat=${location.latitude}&lon=${location.longitude}&key=${FORECAST_API_KEY}`);

            console.log(forecastResponse.data);
            // console.log(forecastResponse.data.city_name);
            // console.log(forecastResponse.data.data[0].weather.description);
            // console.log(forecastResponse.data.data[0].valid_date);
            // console.log(forecastResponse.data.data[0].low_temp);
            // console.log(forecastResponse.data.data[0].high_temp);

            if (!forecastResponse || forecastResponse.data.length === 0) {
                throw new Error('The coordinates of the specified location could not be found.');
            }

            const data = forecastResponse.data.data;

            const forecastMessage = data.map((day) =>
`🔹${day.valid_date}
Weather: ${day.weather.description}
Nighttime: ${day.low_temp}
Daytime: ${day.high_temp} \n\n`
            ).join('')

            ctx.reply(`📍${forecastResponse.data.city_name} \n\n` + forecastMessage);
        }

    } catch (error) {
        console.error(error.message);
        ctx.reply('This location could not be processed. Please try again.');
    }
})



bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));