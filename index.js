const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
require("dotenv").config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const API_KEYS = {
    weather: process.env.WEATHER_API_KEY,
    air: process.env.AIR_API_KEY,
    forecast: process.env.FORECAST_API_KEY,
}

const API_URLS = {
    geoCoding: `http://api.openweathermap.org/geo/1.0/direct`,
    currentWeather: `https://api.openweathermap.org/data/2.5/weather`,
    forecastWeather: `https://api.weatherbit.io/v2.0/forecast/daily`,
    airQuality: `http://api.airvisual.com/v2/nearest_city`,
  };

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) =>
  ctx.reply("Welcome to a Weather Air Bot! \nSend me your Location")
);


// User Location History
let userLocations = {}

// Current Location State 
let location = {};


// Location determination
bot.on("message", async (ctx) => {
    try {
        const location = ctx.message.location
            ? getCoordinatesFromLocation(ctx.message.location)
            : await getCoordinatesFromText(ctx.update.message.text);

        if (!location) {
            throw new Error('The coordinates of the specified location could not be found.');
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


function getCoordinatesFromLocation(location) {
    return {
        latitude: location.latitude,
        longitude: location.longitude
    }
}

async function getCoordinatesFromText(locationAsText) {
    try {
        const normalizeText = locationAsText.replaceAll(' ', '');
        const geoResult = await axios.get(API_URLS.geoCoding, {
            params: {
                q: normalizeText,
                appid: API_KEYS.weather,
            },
        });

        if (!geoResult.data || geoResult.data.length === 0) {
            return null;
        }

        return {
            latitude: geoResult.data[0].lat,
            longitude: geoResult.data[0].lon
        };

    } catch (error) {
        console.error('Error fetching geolocation data:', error.message);
        return null;
    }
};


// Response Processing for Current
bot.action('current', async (ctx) => {

    try {
        console.log(location);
        const [weatherResponse, airQualityResponse] = await Promise.all([
            axios.get(API_URLS.currentWeather, {
                params: {
                    lat: location.latitude,
                    lon: location.longitude,
                    appid: API_KEYS.weather
                }
            }),
            axios.get(API_URLS.airQuality, {
                params: {
                    lat: location.latitude,
                    lon: location.longitude,
                    key: API_KEYS.air
                }
            })
        ]);

        const weatherData = weatherResponse.data;
        const airQualityData = airQualityResponse.data.data;
        let celsius = weatherResponse.data.main.temp - 273.15;

        ctx.reply(
            `Country: ${airQualityData.country}\n` +
            `City/Region: ${weatherData.name}\n` +
            `Temperature: ${Math.round(celsius)} °C / ${Math.round(1.8 * celsius + 32)} °F\n` +
            `Weather: ${weatherData.weather[0].description}\n` +
            `Air quality: ${airQualityData.current.pollution.aqius}`
        )
    } catch (error) {
        console.error('Error fetching weather or air quality data:', error.message);
        ctx.reply('Failed to retrieve weather or air quality data. Please try again later.');
    }
})


// Response Processing for Forecast
bot.action('forecast', async ctx => {
    try {
        if(location && location.latitude && location.longitude) {
            const forecastResponse = await axios.get(API_URLS.forecastWeather, {
                params: {
                    lat: location.latitude,
                    lon: location.longitude,
                    key: API_KEYS.forecast
                }
            });

            console.log(forecastResponse.data);

            if (!forecastResponse || forecastResponse.data.data.length === 0) {
                throw new Error('Forecast data could not be found for the specified location.');
            }

            const city = forecastResponse.data.city_name;
            const data = forecastResponse.data.data;

            const forecastMessage = data.map((day) =>
                `🔹${day.valid_date}\n` +
                `Weather: ${day.weather.description}\n` +
                `Nighttime: ${day.low_temp} °C\n` +
                `Daytime: ${day.high_temp} °C\n\n`
            ).join('');

            ctx.reply(`📍${city}\n\n${forecastMessage}`);
        } else {
            throw new Error('Location information is missing.');
        }
    } catch (error) {
        console.error('Error fetching forecast data:', error.message);
        ctx.reply('Failed to retrieve the weather forecast. Please try again later.');
    }
})



bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));