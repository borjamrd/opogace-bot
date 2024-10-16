import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import fs from "fs";
import http from "http";
import https from "https";
import * as cheerio from 'cheerio';

require('dotenv').config();

const token = process.env.TOKEN

if (!token) {
    throw new Error("Token is required");
}
if (!process.env.chatIdINAP) {
    throw new Error("chatIdINAP is required");
}
const bot = new TelegramBot(token, { polling: true });
let chatIdINAP = process.env.chatIdINAP
let minTime: number;
let maxTime: number;
let integrationStarted = false
let botId: number;

if (process.env.STATE === 'prod') {
    console.log('🚀 Bot en modo producción')
    minTime = 300000;
    maxTime = 600000;

} else {
    console.log('🚀 Bot en modo desarrollo')
    minTime = 10000;
    maxTime = 15000;
}


function generateRandomTime(min: number, max: number) {
    let randomTime = Math.random() * (max - min) + min;
    return randomTime
}
const urls = [
    {
        name: 'Convocatoria GACE TL 22-24',
        file: "./src/files/gace_tl_2024.txt",
        portalMessage: 'Información actualizada sobre convocatoria GACE TL 22-24: ',
        url: "https://sede.inap.gob.es/es/gacel-2024"
    },
    {
        name: 'GACE PI - 21-24',
        file: "./src/files/gace_pi_2024.txt",
        portalMessage: 'Información actualizada sobre convocatoria GACE PI 21-24: ',
        url: "https://sede.inap.gob.es/es/gacepi-2024"
    },
    {
        name: 'Convocatoria Administrativos AGE TL 23-24',
        file: "./src/files/age_tl_2024.txt",
        portalMessage: 'Información actualizada en la web de la convocatoria Administrativos AGE TL 23-24: ',
        url: "https://sede.inap.gob.es/es/advol-2024"
    },

    {
        name: 'Convocatoria Administrativos AGE PI 21-24',
        file: "./src/files/age_pi_2024.txt",
        portalMessage: 'Información actualizada en la web de la convocatoria Administrativos AGE PI 21-24: ',
        url: "https://sede.inap.gob.es/es/advopi-2024"
    },
]

async function getChangesMessage(path: string, url: string) {
    console.log('🔍Buscando cambios en ' + url)
    try {
        const httpAgent = new http.Agent({ keepAlive: true });
        const httpsAgent = new https.Agent({ keepAlive: true });
        const axiosInstance = axios.create({
            httpAgent,
            httpsAgent,
        });


        const response = await axiosInstance.get(url);
        const html = response.data;

        const $ = cheerio.load(html);
        const bodyContent = $("body").html();

        if (!bodyContent) {
            console.log('🔥 Error al obtener contenido de la página')
            bot.sendMessage(botId, '🔥 Error al obtener contenido de la página')
            return null;
        }
        let oldData
        if (fs.existsSync(path)) {
            oldData = await readData(path); // Read the file if it exists
        } else {
            oldData = undefined
        }

        if (oldData !== bodyContent) {
            writeData(path, bodyContent);
            console.log('✅ Se han encontrado cambios')
            return true;
        } else {
            console.log('📂 No se han encontrado cambios')
            return null;
        }
    } catch (error) {
        console.log()
        bot.sendMessage(botId, '🔥 Error al obtener cambios')
        console.error("Error al obtener cambios");
    }
}

async function readData(path: string) {
    try {
        const data = fs.readFileSync(path, "utf8");
        return data;
    } catch (err) {
        console.error("Error al leer el archivo de datos:", err);
        return null;
    }
}

function writeData(path: string, data: string) {

    try {
        fs.writeFileSync(path, data); // Escribir como texto
    } catch (err) {
        console.error("Error al escribir en el archivo de datos:", err);
    }
}

async function startIntegration() {

    for (const { name, file, url, portalMessage } of urls) {
        const changes = await getChangesMessage(file, url);
        if (changes) {
            sendMessage(name, url, portalMessage);
        }
    }
}

function sendMessage(portalName: string, portalUrl: string, portalMessage: string) {
    bot.sendMessage(chatIdINAP, `${portalMessage}`, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [[{
                text: `☑️ Ir al portal ${portalName}`,
                url: portalUrl,
            }]]
        },
    });
}

async function runProject() {

    console.log('Starting server, waiting for "pochi" message on bot')

    try {
        bot.onText(/\/pochi/, async (msg) => {
            botId = msg.chat.id
            if (integrationStarted) {
                bot.sendMessage(botId, 'Ya hay una integración en curso')
            } else {
                bot.sendMessage(botId, 'Comienza la integración, este bot enviará actualizaciones al canal')
                integrationStarted = true
                await startIntegration();
                setInterval(() => {
                    startIntegration();
                }, generateRandomTime(minTime, maxTime));
            }
        })

    } catch (error) {
        console.error('Error en main:', error);

    }

}
runProject();
