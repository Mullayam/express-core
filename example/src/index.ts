import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import { RegisterRoutes, RouteResolver } from '@enjoys/test2';
import { MyController } from './controllers/MyController';
import { createHandlers, HttpException } from '@enjoys/exception';

const app = express();

const port = 3000;

// Execute all middlewares
app.use(bodyParser.json());


// Extract handlers
const { ExceptionHandler, UnhandledRoutes } = createHandlers()


async function main() {
    // const modules = await importAllModules(directoryPath);       
    RegisterRoutes(app, [MyController])

    // to show all registered routed thorough out the application , always use this before listening and after registering all routes
    RouteResolver.Mapper(app, { listEndpoints: true })

    // use this middleware to handle all unhandled routes. 
    app.use("/*", UnhandledRoutes)
    // Always  call at the end of app to handle all unhandled routes
    app.use(ExceptionHandler)

    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });

}
main()


