import { createServer } from 'node:http'
import 'dotenv/config'
import { createApplication } from './app/app.js'
import { env } from "./app/common/config/env.js"
import './db/index.js'


async function main() {
    try {
        const server = createServer(createApplication());
        
        //SERVER STARTUP (Fixed to bind to 0.0.0.0)
        server.listen(env.PORT, "0.0.0.0", () => {
            console.log(`[Server] Running in ${env.NODE_ENV} mode`);
            console.log(`[Server] Listening on 0.0.0.0:${env.PORT}`);
        });

        //GLOBAL SAFETY NETS (Added to prevent quiet 502 crashes)
        process.on('uncaughtException', (err) => {
            console.error('CRITICAL: Uncaught Exception:', err);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
        })
    } catch (error) {
        console.error("Error starting http server:", error);
        process.exit(1);
    }
}

main();
