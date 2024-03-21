import TelegramApi from 'node-telegram-bot-api';
import {ChatGPTAPI} from 'chatgpt';
import {google} from 'googleapis';
import {config as configDotenv} from 'dotenv';


configDotenv();

const bot = new TelegramApi(process.env.BOT_TOKEN, {
    polling: true
});
const gpt = new ChatGPTAPI({
    apiKey: process.env.GPT_KEY
});
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_KEY
});

const start = () => {
    bot.setMyCommands([{
            command: '/info',
            description: 'Что может делать этот бот?'
        },
        {
            command: '/start',
            description: 'Начальное приветствие!'
        },
        {
            command: '/search',
            description: 'Поиск видео в YouTube'
        },
    ]);

    let awaitingVideoTitle = {};

    bot.on('message', async msg => {
        const text = msg.text;
        const chatID = msg.chat.id;
        const name = msg.chat.first_name;

        if (text === '/info') {
            await bot.sendMessage(chatID, `${name}, добро пожаловать в мой бот, по команде /start ты можешь обратиться к ChatGPT, а также по команде /search можешь найти видео в YouTube!`);
        } else if (text === '/start') {
            await bot.sendSticker(chatID, 'https://a127fb2c-de1c-4ae0-af0d-3808559ec217.selcdn.net/stickers/80a/5c9/80a5c9f6-a40e-47c6-acc1-44f43acc0862/192/1.webp');

            const response = await gpt.sendMessage(`Привет, ${name}!Как я могу помочь тебе сегодня ?`);
            await bot.sendMessage(chatID, response.text);

        } else if (text === '/search') {
            await bot.sendMessage(chatID, `${name}, введи название видео!`);
            awaitingVideoTitle[chatID] = true;
        } else if (awaitingVideoTitle[chatID]) {
            const videoUrl = await searchYouTube(text, 3);

            if (videoUrl.length === null) {
                await bot.sendMessage(chatID, 'По вашему запросу ничего не найдено на YouTube');
            }

            if (videoUrl.length > 0) {
                await bot.sendMessage(chatID, `Вот результаты поиска на YouTube:`);

                for (const url of videoUrl) {
                    await bot.sendMessage(chatID, url);
                }
            } else {
                await bot.sendMessage(chatID, 'По вашему запросу ничего не найдено на YouTube');
            }
            delete awaitingVideoTitle[chatID];

        } else {
            const response = await gpt.sendMessage(text);
            await bot.sendMessage(chatID, response.text);
        }
    });
};

async function searchYouTube(query) {
    try {
        const response = await youtube.search.list({
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: 3,
        });

        console.log(response.data.item)

        const videoUrls = response.data.items.map(item => {
            const videoId = item.id.videoId;
            return `https://www.youtube.com/watch?v=${videoId}`;
        });

        return videoUrls;

    } catch (error) {
        console.error('Error searching YouTube:', error);
        return null;
    }
}

start();