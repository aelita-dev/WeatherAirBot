const { Telegraf } = require("telegraf");
const axios = require("axios");
require("dotenv").config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const { WEATHER_API_KEY } = process.env;
const { AIR_API_KEY } = process.env;

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) =>
  ctx.reply("Welcome to a Weather Air Bot! \nSend me Your location")
);

bot.on("message", async (ctx) => {
  if (ctx.message.location) {
    const location = ctx.message.location;

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${WEATHER_API_KEY}`;
    const weatherResponse = await axios.get(weatherUrl);

    const airQualityUrl = `http://api.airvisual.com/v2/nearest_city?lat=${location.latitude}&lon=${location.longitude}&key=${AIR_API_KEY}`;
    const airQualityResponse = await axios.get(airQualityUrl);

    let celsius = weatherResponse.data.main.temp - 273.15;

    ctx.reply(
      `Country: ${airQualityResponse.data.data.country} \n
City/Region: ${weatherResponse.data.name} \n
Temperature: ${parseInt(celsius)} °C / ${parseInt(1.8 * celsius + 32)} °F \n
Weather: ${weatherResponse.data.weather[0].description} \n
Air quality: ${airQualityResponse.data.data.current.pollution.aqius}`
    );
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));