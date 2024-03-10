require('dotenv').config()

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");
const cheerio = require("cheerio");

const token = process.env.TOKEN // Reemplaza con tu token de bot

const bot = new TelegramBot(token, { polling: true });

const chatIdINAP = process.env.chatIdINAP

let chatIdINAP_BETA = process.env.chatIdINAP_BETA

let integrationStarted = false

const time = 15000;

// const time = 1800000


const url_selectivos = "https://sede.inap.gob.es/notas-inap/selectivos.html";




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

    const selectivosChanges = await getChangesMessage("./file_selectivos.txt", url_selectivos);

    selectivosChanges && sendMessage('GACE OEP/2022 - Selectivos', url_selectivos)





}

function sendMessage(portalName, portalUrl) {
    bot.sendMessage(chatIdINAP_BETA, `⚠️ Información actualizada en el siguiente portal: ${portalName}`, {
        parse_mode: "HTML",
        reply_markup: JSON.stringify({
            inline_keyboard: [[{
                text: `☑️ Ir al portal ${portalName}`,
                url: portalUrl,
            }]]
        }),
    });
}


async function main() {

    console.log('Starting server, waiting for "pochi" message on bot')

    try {

        bot.onText(/\/pochi/, (msg) => {

            bot.sendMessage(msg.chat.id, 'Comienza la integración, este bot enviará actualizaciones al canal')
            if (integrationStarted) {
                bot.sendMessage(chatIdINAP_BETA, 'Ya hay una integración en curso')
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