require('dotenv').config()

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");
const cheerio = require("cheerio");

const token = process.env.TOKEN // Reemplaza con tu token de bot

const bot = new TelegramBot(token, { polling: true });
let chatId = ''
let integrationStarted = false

// const time = 30000;

const time = 1800000


const url_prom_interna = "https://sede.inap.gob.es/gacepi-oep-2020-2021-2022";
const url_ingre_libre = "https://sede.inap.gob.es/gacel-oep-2020-2021-2022";
const url_temporal = "https://sede.inap.gob.es/gacee-oep-2022";



async function getChangesMessage(path, url) {
    console.log('🔍Buscando cambios en ' + url)
    try {


        const response = await axios.get(url);
        const html = response.data;

        const $ = cheerio.load(html);
        const bodyContent = $("body").html();
        const oldData = readData(path);

        if (oldData !== bodyContent) {
            writeData(path, bodyContent);
            console.log('✅ Se han encontrado cambios')
            return true;
        } else {
            console.log('📂 No se han encontrado cambios')
            return null;
        }
    } catch (error) {
        console.error("Error al obtener cambios");
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




async function startIntegration() {

    const newPromInChanges = await getChangesMessage("./file_prom_interna.html", url_prom_interna);
    const newInLibreChanges = await getChangesMessage("./file_ingre_libre.html", url_ingre_libre);
    const newTempChanges = await getChangesMessage("./file_temporal.html", url_temporal);

    newPromInChanges && bot.sendMessage(chatId, "⚠️Se han detectado cambios en el siguiente PORTAL:", {
        parse_mode: "HTML",
        reply_markup: JSON.stringify({
            inline_keyboard: [[{
                text: "☑️ GACE OEP/2022- Promoción interna",
                url: url_prom_interna,
            }]]
        }),
    });


    newInLibreChanges && bot.sendMessage(chatId, "⚠️Se han detectado cambios en el siguiente PORTAL:", {
        parse_mode: "HTML",
        reply_markup: JSON.stringify({
            inline_keyboard: [[{
                text: "☑️ GACE OEP/2022 - Ingreso libre",
                url: url_ingre_libre,
            }]]
        }),
    });
    newTempChanges && bot.sendMessage(chatId, "⚠️Se han detectado cambios en el siguiente PORTAL:", {
        parse_mode: "HTML",
        reply_markup: JSON.stringify({
            inline_keyboard: [[{
                text: "☑️ GACE OEP/2022- Estabilización",
                url: url_temporal,
            }]]
        }),
    });



}


async function main() {

    console.log('Starting server, waiting for "pochi" message')

    try {

        bot.on('channel_post', (msg) => {

            if (msg.text !== '/pochi') return
            chatId = msg.sender_chat.id

            if (integrationStarted) {
                bot.sendMessage(chatId, 'Ya hay una integración en curso')
            } else {
                integrationStarted = true
                setInterval(() => {
                    startIntegration();
                }, time);

            }


        })


    } catch (error) {
        console.error('Error en main:', error);

    }

}
main();