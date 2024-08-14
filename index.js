const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const { WEATHER_API_KEY } = process.env;

const bot = new Telegraf(BOT_TOKEN);


bot.start(ctx => ctx.reply('Welcome to a Weather Air Bot! \nSend me Your location'));
bot.on('message', async ctx => {
    if(ctx.message.location) {
        const location = ctx.message.location;

        const requestUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${WEATHER_API_KEY}`;
        const response = await axios.get(requestUrl);

        ctx.reply(`${response.data.name}: ${response.data.main.temp} ℃`)
    }
})
bot.launch();


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));