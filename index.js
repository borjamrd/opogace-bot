require('dotenv').config()

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");
const cheerio = require("cheerio");

const token = process.env.TOKEN // Reemplaza con tu token de bot

const bot = new TelegramBot(token, { polling: true, });

// const time = 15000;

const time = 3600000


const url_prom_interna = "https://sede.inap.gob.es/gacepi-oep-2020-2021-2022";
const url_ingre_libre = "https://sede.inap.gob.es/gacel-oep-2020-2021-2022";
const url_temporal = "https://sede.inap.gob.es/gacee-oep-2022";




async function getChangesMessage(path, url) {

    try {
        const response = await axios.get(url);
        const html = response.data;

        const $ = cheerio.load(html);
        const bodyContent = $("body").html();
        const oldData = readData(path);

        if (oldData !== bodyContent) {
            writeData(path, bodyContent);
            return true;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error al obtener cambios:", error);
    }
}

function readData(path) {
    try {
        const data = fs.readFileSync(path, "utf8");
        return data;
    } catch (err) {
        console.error("Error al leer el archivo de datos:", err);
        return null;
    }
}

function writeData(path, data) {

    try {
        fs.writeFileSync(path, data); // Escribir como texto
    } catch (err) {
        console.error("Error al escribir en el archivo de datos:", err);
    }
}
bot.onText(/\/pochi/, async (msg, match) => {


    setInterval(() => {
        startIntegration(bot, msg);
    }, time);
    readData();
    startIntegration(bot, msg);

});

async function startIntegration(bot, msg) {

    if (bot.isPolling()) {
        await bot.stopPolling();
    }
    await bot.startPolling();

    const chatId = msg.chat.id;


    const newPromInChanges = await getChangesMessage("./file_prom_interna.html", url_prom_interna);
    const newInLibreChanges = await getChangesMessage("./file_ingre_libre.html", url_ingre_libre);
    const newTempChanges = await getChangesMessage("./file_temporal.html", url_temporal);

    newPromInChanges && bot.sendMessage(chatId, "⚠️Información actualizada en el siguiente PORTAL:", {
        parse_mode: "HTML",
        reply_markup: JSON.stringify({
            inline_keyboard: [[{
                text: "☑️ GACE OEP/2022- Promoción interna",
                url: url_prom_interna,
            }]]
        }),
    });


    newInLibreChanges && bot.sendMessage(chatId, "⚠️Información actualizada en el siguiente PORTAL:", {
        parse_mode: "HTML",
        reply_markup: JSON.stringify({
            inline_keyboard: [[{
                text: "☑️ GACE OEP/2022 - Ingreso libre",
                url: url_ingre_libre,
            }]]
        }),
    });
    newTempChanges && bot.sendMessage(chatId, "⚠️Información actualizada en el siguiente PORTAL:", {
        parse_mode: "HTML",
        reply_markup: JSON.stringify({
            inline_keyboard: [[{
                text: "☑️ GACE OEP/2022- Estabilización",
                url: url_temporal,
            }]]
        }),
    });


    await bot.stopPolling();

}


process.on('uncaughtException', function (error) {
    console.log("\x1b[31m", "Exception: ", error, "\x1b[0m");
});

process.on('unhandledRejection', function (error, p) {
    console.log("\x1b[31m", "Error: ", error.message, "\x1b[0m");
});