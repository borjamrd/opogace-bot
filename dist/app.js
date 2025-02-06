"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const cheerio = __importStar(require("cheerio"));
require('dotenv').config();
const token = process.env.TOKEN;
if (!token) {
    throw new Error("Token is required");
}
if (!process.env.chatIdINAP) {
    throw new Error("chatIdINAP is required");
}
const bot = new node_telegram_bot_api_1.default(token, { polling: true });
let chatIdINAP = process.env.chatIdINAP;
let minTime;
let maxTime;
let integrationStarted = false;
let botId;
if (process.env.STATE === 'prod') {
    console.log('🚀 Bot en modo producción');
    minTime = 300000;
    maxTime = 600000;
}
else {
    console.log('🚀 Bot en modo desarrollo');
    minTime = 10000;
    maxTime = 15000;
}
function generateRandomTime(min, max) {
    let randomTime = Math.random() * (max - min) + min;
    return randomTime;
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
];
function getChangesMessage(path, url) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔍Buscando cambios en ' + url);
        try {
            const httpAgent = new http_1.default.Agent({ keepAlive: true });
            const httpsAgent = new https_1.default.Agent({ keepAlive: true });
            const axiosInstance = axios_1.default.create({
                httpAgent,
                httpsAgent,
            });
            const response = yield axiosInstance.get(url);
            const html = response.data;
            const $ = cheerio.load(html);
            const bodyContent = $("body").html();
            if (!bodyContent) {
                console.log('🔥 Error al obtener contenido de la página');
                bot.sendMessage(botId, '🔥 Error al obtener contenido de la página');
                return null;
            }
            let oldData;
            if (fs_1.default.existsSync(path)) {
                oldData = yield readData(path); // Read the file if it exists
            }
            else {
                oldData = undefined;
            }
            if (oldData !== bodyContent) {
                writeData(path, bodyContent);
                console.log('✅ Se han encontrado cambios');
                return true;
            }
            else {
                console.log('📂 No se han encontrado cambios');
                return null;
            }
        }
        catch (error) {
            console.log();
            bot.sendMessage(botId, '🔥 Error al obtener cambios');
            console.error("Error al obtener cambios");
        }
    });
}
function readData(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = fs_1.default.readFileSync(path, "utf8");
            return data;
        }
        catch (err) {
            console.error("Error al leer el archivo de datos:", err);
            return null;
        }
    });
}
function writeData(path, data) {
    try {
        fs_1.default.writeFileSync(path, data); // Escribir como texto
    }
    catch (err) {
        console.error("Error al escribir en el archivo de datos:", err);
    }
}
function startIntegration() {
    return __awaiter(this, void 0, void 0, function* () {
        for (const { name, file, url, portalMessage } of urls) {
            const changes = yield getChangesMessage(file, url);
            if (changes) {
                sendMessage(name, url, portalMessage);
            }
        }
    });
}
function sendMessage(portalName, portalUrl, portalMessage) {
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
function runProject() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting server, waiting for "pochi" message on bot');
        try {
            bot.onText(/\/pochi/, (msg) => __awaiter(this, void 0, void 0, function* () {
                botId = msg.chat.id;
                if (integrationStarted) {
                    bot.sendMessage(botId, 'Ya hay una integración en curso');
                }
                else {
                    bot.sendMessage(botId, 'Comienza la integración, este bot enviará actualizaciones al canal');
                    integrationStarted = true;
                    yield startIntegration();
                    setInterval(() => {
                        startIntegration();
                    }, generateRandomTime(minTime, maxTime));
                }
            }));
        }
        catch (error) {
            console.error('Error en main:', error);
        }
    });
}
runProject();
