import 'reflect-metadata';
import * as fs from 'fs'
import moment from 'moment';
import cron from 'node-cron'
import jwt from "jsonwebtoken";
import { globSync } from 'glob';
import path, { join } from "path";
import { pathToFileURL } from 'url';
import { DIContainer } from "./common";
import { METADATA_KEYS } from "./constants";
import { HttpException } from "@enjoys/exception";
import { interval, timer, Observable } from "rxjs";
import { validationResult } from 'express-validator';
import { rateLimit, Options as RLOptions } from 'express-rate-limit'
import { AllowedRoles, IUser, LoggingLevel } from "./types";
import { Application, NextFunction, Request, RequestHandler, Response, Router } from 'express';
import { bold, greenBright, magenta, red, white, yellow, bgCyan, bgMagenta, bgWhite, blue, blueBright, gray, green, } from 'colorette';
import { HttpStatusCode, CronExpression, RouteDefinition, RoutingMethods, Middlewares, Endpoint, StackItem, Type, RouteMethods } from './types';

const SetAppRoutes = new Map();

const ROUTES_KEY = Symbol('routes');
const MIDDLEWARE_KEY = Symbol('middleware');
const packagePath = join(process.cwd(), "package.json");
const regExpToParseExpressPathRegExp =
    /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/;
const regExpToReplaceExpressPathRegExpParams = /\(\?:\(\[\^\\\/]\+\?\)\)/;
const regexpExpressParamRegexp = /\(\?:\(\[\^\\\/]\+\?\)\)/g;

const EXPRESS_ROOT_PATH_REGEXP_VALUE = '/^\\/?(?=\\/|$)/i';
const STACK_ITEM_VALID_NAMES = ['router', 'bound dispatch', 'mounted_app'];
export class FilesMapper {
    private static extractExports(importedModule: any): any[] {
        return Object.values(importedModule).filter(exp => typeof exp === 'function');
    }

    private static async getFilesRecursively(directory: string): Promise<string[]> {

        const entries = await fs.promises.readdir(directory, { withFileTypes: true });
        console.log(entries)
        const files = entries.map(entry => {
            const res = path.resolve(directory, entry.name);
            return entry.isDirectory() ? this.getFilesRecursively(res) : Promise.resolve(res);
        });
        return Array.prototype.concat(...(await Promise.all(files)));
    }
    /**
    * Asynchronously imports modules from the given path.
    *
    * @param {string} path - The path to the modules to import. Can contain glob patterns  ./src/*.{ts,js} .      
    * @return {Promise<any[]>} A promise that resolves to an array of imported modules.
    */
    static async _importModules(path: string): Promise<any[]> {
        const files = path.includes('*') ? globSync(path, { ignore: 'node_modules/**' }) : await this.getFilesRecursively(path)

        const modules: any[] = [];
        for (const file of files) {
            if (file.endsWith('.ts') || file.endsWith('.js') && !file.endsWith('.d.ts') && !file.endsWith('.test.ts') && !file.endsWith('.spec.ts')) {
                try {
                    const moduleUrl = pathToFileURL(file).href;
                    const importedModule = await import(moduleUrl);
                    console.log(this.extractExports(importedModule))
                    modules.push(...this.extractExports(importedModule));
                } catch (error) {
                    console.error(`Failed to import module: ${file}`, error);
                }
            }
        }
        return modules;
    }

    /**
     * A funtion to import modules only from directories
     *
     * @param {string} pathName - path to the file
     * @param {"default" | "special"} [type="default"] - description of parameter
     * @return {Type[] | any} description of return value
     */
    static forRoot<K>(pathName: string, type: "default" | "special" = "default"): Type[] | any {
        const __workingDir = path.join(process.cwd(), pathName)
        let modules: any = [];
        const result = fs.readdirSync(__workingDir)
            .filter((file) => file.startsWith('index') === false)
            .filter((file) => (path.extname(file) === '.js') || (file !== '.ts') && !file.endsWith('.d.ts'))
            .filter((file) => file.indexOf(".spec") === -1 && file.indexOf(".test") === -1)

        if (type === "default") {
            modules = result.map((file) => require(`${__workingDir}/${file}`).default as any)
            return modules
        }

        if (type === "special") {
            result.forEach((file) => {
                const module = require(`${__workingDir}/${file}`) as any
                for (const key in module) {
                    // Check if the key is a function
                    if (typeof module[key] === 'function') {
                        modules.push(module[key])
                    }
                }
            })
            return modules
        }


    }
    /**
     * A funtion to import modules like "controller" | "entity" | "service" | "middleware" | "migrations"
     *
     * @param {string} pathName - path to modules    
     * @return {Type[] | any} description of return value
     */
    static forFeature<K>(pathName: string): Type[] | any {
        const __workingDir = path.join(process.cwd(), pathName)
        return fs.readdirSync(__workingDir)
            .filter((file) => file.startsWith('index') === false)
            .filter((file) => (path.extname(file) === '.js') || (file !== '.ts') && !file.endsWith('.d.ts'))
            .filter((file) => file.indexOf(".spec") === -1 && file.indexOf(".test") === -1)
            .map((file) => require(`${__workingDir}/${file}`).default as any)
    }

}
export class RouteResolver {
    /**
        * Maps the routes of the provided Express Application and prints the endpoints if the `listEndpoints` option is set to true.
        *
        * @param {Application} AppServer - The Express Application to map the routes for.
        * @param {Object} options - An optional object containing the following properties:
        *   - listEndpoints: A boolean indicating whether to print the endpoints or not. Default is false.
        *   - onlyPaths: A boolean indicating whether to print only the paths of the endpoints or not. Default is false.
        */
    static Mapper(AppServer: Application, options: { listEndpoints?: boolean, onlyPaths?: boolean } = { listEndpoints: false, onlyPaths: false }) {
        if (options.listEndpoints) {
            // listEndpoints(AppServer)
            this.prototype.getEndpoints(AppServer).forEach((endpoint, key, arr) => {
                SetAppRoutes.set(endpoint.path, endpoint.methods)
                const str = `${endpoint.methods.includes('GET') ? bold(bgWhite(gray('GET')))
                    : endpoint.methods.includes('POST') ? bold(bgCyan(blue('POST')))
                        : endpoint.methods.includes('PATCH') ? bold(bgCyan(magenta('PATCH')))
                            : endpoint.methods.includes('PUT') ? bold(bgMagenta(green('PUT')))
                                : endpoint.methods.includes('DELETE') ? bold(bgWhite(red('DELETE')))
                                    : bold(yellow(endpoint.methods.join(', ')))} ${!options.onlyPaths && blueBright(endpoint.middlewares.join())} - ${yellow(endpoint.path)}`

                Logging.dev(str);
            });

        }
    }
    private hasParams(expressPathRegExp: string): boolean {
        return regexpExpressParamRegexp.test(expressPathRegExp);
    };
    private getRouteMethods(route: any): RouteMethods {
        let methods = Object.keys(route.methods);

        methods = methods.filter((method) => method !== '_all');
        methods = methods.map((method) => method.toUpperCase());

        return methods;
    }
    private getRouteMiddlewares(route: any): Middlewares {
        return route.stack.map((item: any) => {
            return item.handle.name || 'anonymous';
        });
    }
    private parseExpressRoute(route: any, basePath: string): Endpoint[] {
        const paths: string[] = [];
        const _this = this
        if (Array.isArray(route.path)) {
            paths.push(...route.path);
        } else {
            paths.push(route.path);
        }

        const endpoints = paths.map((path) => {
            const completePath = basePath && path === '/' ? basePath : `${basePath}${path}`;

            const endpoint: Endpoint = {
                path: completePath,
                methods: _this.getRouteMethods(route),
                middlewares: _this.getRouteMiddlewares(route),
            };

            return endpoint;
        });

        return endpoints;
    };
    private parseExpressPath(expressPathRegExp: RegExp, params: any[]): string {
        let expressPathRegExpExec = regExpToParseExpressPathRegExp.exec(expressPathRegExp.toString());
        let parsedRegExp = expressPathRegExp.toString();
        let paramIndex = 0;

        while (this.hasParams(parsedRegExp)) {
            const paramName = params[paramIndex].name;
            const paramId = `:${paramName}`;

            parsedRegExp = parsedRegExp.replace(regExpToReplaceExpressPathRegExpParams, paramId);

            paramIndex++;
        }

        if (parsedRegExp !== expressPathRegExp.toString()) {
            expressPathRegExpExec = regExpToParseExpressPathRegExp.exec(parsedRegExp);
        }

        const parsedPath = expressPathRegExpExec?.[1].replace(/\\\//g, '/');

        return parsedPath as string;
    };
    private parseEndpoints(app: any, basePath = '', endpoints: Endpoint[] = []): Endpoint[] {
        const stack = app.stack || (app._router && app._router.stack);

        if (!stack) {
            endpoints = this.addEndpoints(endpoints, [
                {
                    path: basePath,
                    methods: [],
                    middlewares: [],
                },
            ]);
        } else {
            endpoints = this.parseStack(stack, basePath, endpoints);
        }

        return endpoints;
    };

    private addEndpoints(currentEndpoints: Endpoint[], endpointsToAdd: Endpoint[]): Endpoint[] {

        endpointsToAdd.forEach((newEndpoint) => {
            const existingEndpoint = currentEndpoints.find((item) => item.path === newEndpoint.path);

            if (existingEndpoint !== undefined) {
                const newMethods = newEndpoint.methods.filter((method) => !existingEndpoint.methods.includes(method));

                existingEndpoint.methods = existingEndpoint.methods.concat(newMethods);
            } else {
                currentEndpoints.push(newEndpoint);
            }
        });

        return currentEndpoints;
    };

    private parseStack(stack: StackItem[], basePath: string, endpoints: Endpoint[]): Endpoint[] {
        stack.forEach((stackItem) => {
            if (stackItem.route) {
                const newEndpoints = this.parseExpressRoute(stackItem.route, basePath);

                endpoints = this.addEndpoints(endpoints, newEndpoints);
            } else if (STACK_ITEM_VALID_NAMES.includes(stackItem.name || '')) {
                const isExpressPathRegexp = regExpToParseExpressPathRegExp.test(stackItem.regexp?.toString() || '');

                let newBasePath = basePath;

                if (isExpressPathRegexp) {
                    const parsedPath = this.parseExpressPath(stackItem.regexp as RegExp, stackItem.keys);

                    newBasePath += `/${parsedPath}`;
                } else if (
                    !stackItem.path &&
                    stackItem.regexp &&
                    stackItem.regexp.toString() !== EXPRESS_ROOT_PATH_REGEXP_VALUE
                ) {
                    const regExpPath = ` RegExp(${stackItem.regexp}) `;

                    newBasePath += `/${regExpPath}`;
                }

                endpoints = this.parseEndpoints(stackItem.handle, newBasePath, endpoints);
            }
        });

        return endpoints;
    };

    private getEndpoints(app: any): Endpoint[] {
        const endpoints = this.parseEndpoints(app);

        return endpoints;
    };
}
/**
 * Decorator function that sets the base path and middleware for a controller.
 *
 * @param {string} basePath - The base path for the controller.
 * @param {Function[]} [middlewares=[]] - The middleware functions to be applied to the controller.
 * @return {ClassDecorator} - The class decorator.
 */
export function Controller(basePath: string, middlewares: Function[] = []): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata('basePath', basePath, target);
        Reflect.defineMetadata(MIDDLEWARE_KEY, middlewares, target);
    };
}

function createRouteDecorator(method: RoutingMethods) {
    return (path: string, middlewares: Function[] = []): MethodDecorator => {
        return (target, propertyKey) => {
            const routes: RouteDefinition[] = Reflect.getMetadata(ROUTES_KEY, target) || [];
            routes.push({ path, method, handlerName: propertyKey as string, middlewares });
            Reflect.defineMetadata(ROUTES_KEY, routes, target);
        };
    };
}
/**
 * Creates a GET route decorator with the specified path and middlewares.
 *
 * @param {string} path - The path of the GET route. Defaults to an empty string.
 * @param {Function[]} middlewares - The middlewares to be applied to the GET route. Defaults to an empty array.
 * @return {MethodDecorator} - The GET route decorator.
 */
export const Get = (path: string = '', middlewares: Function[] = []) => createRouteDecorator('get')(path, middlewares);
/**
 * Creates a POST route decorator with the specified path and middlewares.
 *
 * @param {string} path - The path of the POST route. Defaults to an empty string.
 * @param {Function[]} middlewares - The middlewares to be applied to the POST route. Defaults to an empty array.
 * @return {MethodDecorator} - The POST route decorator.
 */
export const Post = (path: string = '', middlewares: Function[] = []) => createRouteDecorator('post')(path, middlewares);
/**
 * Creates a PUT route decorator with the specified path and middlewares.
 *
 * @param {string} path - The path of the PUT route. Defaults to an empty string.
 * @param {Function[]} middlewares - The middlewares to be applied to the PUT route. Defaults to an empty array.
 * @return {MethodDecorator} - The PUT route decorator.
 */
export const Put = (path: string = '', middlewares: Function[] = []) => createRouteDecorator('put')(path, middlewares);
/**
 * Creates a DELETE route decorator with the specified path and middlewares.
 *
 * @param {string} path - The path of the DELETE route. Defaults to an empty string.
 * @param {Function[]} middlewares - The middlewares to be applied to the DELETE route. Defaults to an empty array.
 * @return {MethodDecorator} - The DELETE route decorator.
 */
export const Delete = (path: string = '', middlewares: Function[] = []) => createRouteDecorator('delete')(path, middlewares);
/**
 * Creates a PATCH route decorator with the specified path and middlewares.
 *
 * @param {string} path - The path of the PATCH route. Defaults to an empty string.
 * @param {Function[]} middlewares - The middlewares to be applied to the PATCH route. Defaults to an empty array.
 * @return {MethodDecorator} - The PATCH route decorator.
 */
export const Patch = (path: string = '', middlewares: Function[] = []) => createRouteDecorator('patch')(path, middlewares);
/**
 * Creates a OPTIONS route decorator with the specified path and middlewares.
 *
 * @param {string} path - The path of the OPTIONS route. Defaults to an empty string.
 * @param {Function[]} middlewares - The middlewares to be applied to the OPTIONS route. Defaults to an empty array.
 * @return {MethodDecorator} - The OPTIONS route decorator.
 */
export const Options = (path: string = '', middlewares: Function[] = []) => createRouteDecorator('options')(path, middlewares);
/**
 * Creates a ALL route decorator with the specified path and middlewares.
 *
 * @param {string} path - The path of the ALL route. Defaults to an empty string.
 * @param {Function[]} middlewares - The middlewares to be applied to the ALL route. Defaults to an empty array.
 * @return {MethodDecorator} - The ALL route decorator.
 */
export const All = (path: string = '', middlewares: Function[] = []) => createRouteDecorator('all')(path, middlewares);

/**
 * A Body decorator function that retreive the body data from the request.
 *
 * @param {string} [body=''] - The key to use for the metadata. Defaults to get object of all body data.
 * @return {ParameterDecorator} - The decorator function.
 */
export function Body(body: string = 'any'): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata(`body:${body}`, parameterIndex, target, propertyKey!);
    };
}
/**
 * A Query decorator function that retreive the queries  from the request.
 *
 * @param {string} [queryName=''] - The key to use for the metadata. Defaults to get object of all query data.
 * @return {ParameterDecorator} - The decorator function.
 */
export function Query(queryName: string = 'any'): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata(`query:${queryName}`, parameterIndex, target, propertyKey!);
    };
}
/**
 * A Params decorator function that retreive the params from the path.
 *
 * @param {string} [paramName=''] - The key to use for the metadata. Defaults to get object of all params in path..
 * @return {ParameterDecorator} - The decorator function.
 */
export function Params(paramName: string): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata(`param:${paramName}`, parameterIndex, target, propertyKey!);
    };
}
/**
 * A Cookie decorator function that retreive the cookies from the request.
 *
 * @param {string} [cookiename=''] - The key to use for the cookies data. Defaults to get object of all cookies data.
 * @return {ParameterDecorator} - The decorator function.
 */
export function Cookie(cookiename: string): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata(`cookie:${cookiename}`, parameterIndex, target, propertyKey!);
    };
}
/**
 * A Header decorator function that retreive the headers from the request.
 *
 * @param {string} [headerName=''] - The key to use for the Header. Defaults to get object of all header data.
 * @return {ParameterDecorator} - The decorator function.
 */
export function Header(headerName: string = 'any'): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata(`header:${headerName}`, parameterIndex, target, propertyKey!);
    };
}
/**
 * A decorator function that marks a parameter as the request object.
 *
 * @return {ParameterDecorator} The decorator function.
 */
export function Req(): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata('requestParameter', parameterIndex, target, propertyKey!);
    };
}
/**
 * A decorator function that marks a parameter as the response object.
 *
 * @return {ParameterDecorator} The decorator function.
 */
export function Res(): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {

        Reflect.defineMetadata('responseParameter', parameterIndex, target, propertyKey!);
    };
}
/**
 * Registers routes for the given controllers on the provided Express app.
 *
 * @param {any} app - The Express app to register routes on.
 * @param {any[]} controllers - An array of controller classes to register routes for.
 * @param {string} [globalPrefix=""] - The global prefix to prepend to all routes.
 */
export function RegisterRoutes(app: any, controllers: any[], globalPrefix: string = '') {

    controllers.forEach(controllerClass => {
        const router = Router();
        const basePath = Reflect.getMetadata('basePath', controllerClass) as string;
        const globalMiddlewares = Reflect.getMetadata(MIDDLEWARE_KEY, controllerClass) || [];
        // const serviceInstance = DIContainer.resolve(instanceClass);
        // Reflect.getMetadata(controllerClass, controllerClass);

        const instance = new controllerClass();
        const routes: RouteDefinition[] = Reflect.getMetadata(ROUTES_KEY, controllerClass.prototype) || [];
        routes.forEach((route) => {
            const handler = (req: Request, res: Response, next: NextFunction) => {

                const requestParameters = Reflect.getMetadata('requestParameter', instance, route.handlerName);
                const responseParameters = Reflect.getMetadata('responseParameter', instance, route.handlerName);


                const bodyIndices: Record<string, number> = Reflect.getMetadataKeys(instance, route.handlerName)
                    .filter((key) => key.startsWith('body:'))
                    .reduce((acc, key) => {

                        acc[key.split(':')[1]] = Reflect.getMetadata(key, instance, route.handlerName);
                        return acc;
                    }, {} as Record<string, number>);
                const queryIndices: Record<string, number> = Reflect.getMetadataKeys(instance, route.handlerName)
                    .filter((key) => key.startsWith('query:'))
                    .reduce((acc, key) => {

                        acc[key.split(':')[1]] = Reflect.getMetadata(key, instance, route.handlerName);
                        return acc;
                    }, {} as Record<string, number>);
                const paramIndices: Record<string, number> = Reflect.getMetadataKeys(instance, route.handlerName)
                    .filter((key) => key.startsWith('param:'))
                    .reduce((acc, key) => {

                        acc[key.split(':')[1]] = Reflect.getMetadata(key, instance, route.handlerName);
                        return acc;
                    }, {} as Record<string, number>);

                const headerIndices: Record<string, number> = Reflect.getMetadataKeys(instance, route.handlerName)
                    .filter((key) => key.startsWith('header:'))
                    .reduce((acc, key) => {
                        acc[key.split(':')[1]] = Reflect.getMetadata(key, instance, route.handlerName);
                        return acc;
                    }, {} as Record<string, number>);
                const cookieIndices: Record<string, number> = Reflect.getMetadataKeys(instance, route.handlerName)
                    .filter((key) => key.startsWith('cookie:'))
                    .reduce((acc, key) => {
                        acc[key.split(':')[1]] = Reflect.getMetadata(key, instance, route.handlerName);
                        return acc;
                    }, {} as Record<string, number>);
                const args = [];

                if (requestParameters !== undefined) args[requestParameters] = req;
                if (responseParameters !== undefined) args[responseParameters] = res;
                Object.entries(bodyIndices).forEach(([bodyName, index]) => {
                    if (bodyName === "any") args[index] = req.body
                    else args[index] = req.body[bodyName];
                });
                Object.entries(queryIndices).forEach(([queryName, index]) => {
                    if (queryName === "any") args[index] = req.query;
                    else args[index] = req.query[queryName];
                });
                Object.entries(paramIndices).forEach(([paramName, index]) => {
                    if (paramName === "any") args[index] = req.params;
                    else args[index] = req.params[paramName];
                });
                Object.entries(headerIndices).forEach(([headerName, index]) => {
                    if (headerName === "any") args[index] = req.headers;
                    else args[index] = req.headers[headerName.toLowerCase()];
                });
                Object.entries(cookieIndices).forEach(([cookieName, index]) => {
                    if (cookieName === "any") args[index] = req.cookies;
                    else args[index] = req.cookies[cookieName.toLowerCase()];
                });

                const result = (instance as any)[route.handlerName](...args);

                if (result instanceof Promise) {
                    result.then((value: any) => res.json(value)).catch(next);
                } else {
                    res.json(result);
                }
            };
            const middlewares = [...globalMiddlewares, ...route.middlewares!, handler];
            router[route.method](route.path, ...middlewares);
        });
        globalPrefix = app.get("globalPrefix") || globalPrefix;
        const normalizedPath = (globalPrefix + basePath).replace(/\/{2,}/g, '/')
        app.use(normalizedPath, router);
    })

}

/**
 * Returns a decorator function that applies the given middleware function to the method it decorates.
 *
 * @param {RequestHandler} middlewareFunction - The middleware function to apply.
 * @return {MethodDecorator} A decorator function that applies the middleware to the method.
 */

export function SetMiddleware(middlewareFunction: RequestHandler): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            middlewareFunction(req, res, () => {
                originalMethod.call(this, req, res, next);
            });
        };
    };
}
/**
 * Returns a decorator function that applies the given middleware instance to the method it decorates.
 *
 * @param {any} middlewareInstance - The instance of the middleware to apply.
 * @return {MethodDecorator} A decorator function that applies the middleware to the method.
 */
export function UseMiddleware<T>(middlewareInstance: any): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        // Replace the original method with the new one
        const intance = new middlewareInstance();
        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            intance.activate(req, res, () => {
                originalMethod.call(this, req, res, next);
            });
        };
        return descriptor;
    };
}
/**
 * Creates a middleware decorator that applies the given middleware function to the method it decorates.
 *
 * @param {Function} middleware - The middleware function to apply.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next function in the middleware chain.
 * @return {PropertyDescriptor} The modified property descriptor.
 */
export function Middleware(middleware: (req: Request, res: Response, next: NextFunction) => void) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            middleware(req, res, next);
            return originalMethod.apply(this, arguments);
        };

        return descriptor;
    };
}

/**
* Gracefully shuts down the application.
  * @param {fn} fn - Pass the close server function  
*/
export function GracefulShutdown(fn?: () => void) {
    process.on('SIGINT', () => {
        Logging.dev("Manually Shutting Down", "notice")
        if (fn) fn();
        process.exit(1);
    })
    process.on('SIGTERM', () => {
        Logging.dev("Error Occured", "error")
        if (fn) fn();
        process.exit(1);
    })
    process.on('uncaughtException', (err, origin) => {
        Logging.dev(`Uncaught Exception ${err.name} ` + err.message + err.stack, "error")
        Logging.dev(`Origin Of Error ${origin} `, "error")

    });
    process.on('unhandledRejection', (reason, promise) => {
        Logging.dev(`Unhandled Rejection at ${promise}, reason: ${reason}`, "error")
    });
}
export class Logging {
    private static appName: string | undefined = "AIR"
    static setLocal(text: string): void {
        this.appName = text
    }
    static dev(text: string, type: LoggingLevel = "info") {
        const title = this.appName?.toUpperCase()
        if (type === "info") {
            return process.stdout.write(greenBright(`[${title}] ${yellow(process.pid)} - ${white(moment().format('DD/MM/YYYY hh:mm:ss A'))}, ${(type).toUpperCase()} ${text} \n`))
        }
        if (type === "error") {
            return process.stdout.write(red(`[${title}] ${process.pid} - ${white(moment().format('DD/MM/YYYY hh:mm:ss A'))}, ${(type).toUpperCase()} ${text} \n`))
        }
        if (type === "debug") {
            process.stdout.write(bold(`[${title}] ${process.pid} - ${white(moment().format('DD/MM/YYYY hh:mm:ss A'))},${(type).toUpperCase()} ${text} \n`))
            return process.exit(1)
        }
        if (type === "alert") {
            process.stdout.write(magenta(`[${title}] ${yellow(process.pid)} - ${white(moment().format('DD/MM/YYYY hh:mm:ss A'))}, ${(type).toUpperCase()} ${text}\n`))
        }
        if (type === "notice") {
            return process.stdout.write(yellow(`[${title}] ${process.pid} - ${white(moment().format('DD/MM/YYYY hh:mm:ss A'))}, ${(type).toUpperCase()} ${text}\n`))
        }
    };
}
export function Log(message: string, type: LoggingLevel = "info") {
    return (target: any, key: string, descriptor: any) => {
        const original = descriptor.value;

        descriptor.value = function (...args: any[]) {
            Logging.dev(`${yellow(`[${key}]`)} ${message}`, type)
        }
    }
}
/**
* A decorator function that handles the case when a requested resource is not found.
*
* @param {Request} req - The request object.
* @param {Response} res - The response object.
* @param {NextFunction} next - The next middleware function.
* @return {void} No return value.
*/
export function NotFound() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            return res.status(404).send({ error: "NOT FOUND", code: 404, message: "Content Not Found", stack: { info: "The page you are looking for does not exist", path: req.url } });
        };

        return descriptor;
    };
}

/**
* A decorator function that handles the case when a bad request is made.
*
* @param {any} target - The target object.
* @param {string} propertyKey - The property key.
* @param {PropertyDescriptor} descriptor - The property descriptor.
* @return {PropertyDescriptor} The updated property descriptor.
*/
export function BadRequest() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {

        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            return res.status(400).send({ error: "BAD REQUEST", code: 400, message: "Bad Request - Cannot process", stack: { info: "Bad Request - Api mapping doest not Support this ", path: req.url } });

        };

        return descriptor;
    };
}


/**
 * A decorator function that handles the case when a server error occurs.
 *
 * @return {Function} A function that takes in a target, propertyKey, and descriptor as parameters.
 * This function returns a function that takes in a request, response, and next function as parameters.
 * This inner function sets the response status to 500 and sends a JSON object with the error message, code, and stack information.
 */
export function ServerError() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {

        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            return res.status(500).send({ error: "INTERNAL SERVER ERROR", code: 500, message: "Application Error", stack: { info: "Something went wrong", path: req.url } });
        };

        return descriptor;
    };
}

/**
 * Creates a class decorator that registers the decorated class in the DIContainer.
 *
 * @param {string} name - The name of the class being decorated.
 * @return {ClassDecorator} The decorator function.
 */
export function Injectable(): any {
    return (target: any) => {
        Reflect.defineMetadata(target.name, target, target);
        DIContainer.register(target);
    };
}

/**
 * Decorator that injects a service instance into a target object property.
 *
 * @param {new(...args: any[]) => T} instanceClass - The class of the service to be injected.
 * @return {PropertyDecorator} A property decorator that injects the service instance.
 */
export function Inject<T>(instanceClass: {
    new(...args: any[]): T;
}): PropertyDecorator {
    Logging.dev(`[${instanceClass.name} Instance] dependency injected`);
    return (target: Object, propertyKey: string | symbol) => {
        const serviceInstance = DIContainer.resolve(instanceClass);
        Object.defineProperty(target, propertyKey, {
            value: serviceInstance,
            writable: false,
        });
    };
}

export class Scheduler {
    private static _instance: Scheduler
    private constructor() { }
    public static forRoot(): Scheduler {
        if (!Scheduler._instance) {
            Scheduler._instance = new Scheduler()
        }
        return Scheduler._instance
    }
    addJob(cronExpression: CronExpression, callback: () => void, options?: cron.ScheduleOptions): cron.ScheduledTask {

        return cron.schedule(cronExpression, callback, options)
    }
    getJobs(): Map<string, cron.ScheduledTask> {
        return cron.getTasks()
    }
    validate(cronExpression: string): boolean {
        return cron.validate(cronExpression)
    }

}
function InitializeCronJobs(targetClass: any) {
    const methods = Object.getOwnPropertyNames(targetClass.prototype);
    methods.forEach(methodName => {
        const cronSchedule = Reflect.getMetadata(METADATA_KEYS.CRONJOB, targetClass.prototype, methodName);
        if (cronSchedule) {
            cron.schedule(cronSchedule, targetClass.prototype[methodName]);
            console.log(`Cron job scheduled for method ${methodName} with schedule ${cronSchedule}`);
        }
    });
}
export function CronJob(cronExpression: keyof typeof CronExpression, name?: string | null) {
    if (name === null || !name) {
        name = 'CRON:' + Math.floor(Math.random() * 10000000)
    }
    return (target: any, key: string, descriptor: any) => {
        const original = descriptor.value;
        Logging.dev(`Cron Job added for : ${target.constructor.name}-${key}`, "notice")
        Reflect.defineMetadata(METADATA_KEYS.CRONJOB, CronExpression[cronExpression], target, key);

        InitializeCronJobs(target.constructor)
        descriptor.value = function (...args: any[]) {
            return original(...args)
        }
    }
}


function ThrottleException(message: Record<string, any> = { path: "/", info: "Request Throttled", solution: "Try Again after time" }): void {
    new HttpException({ name: "TOO_MANY_REQUESTS", message: "Current Rate Limit is Exceeded", stack: message })
}
// Interface for rate limit options
type RateLimitOptions = Omit<Partial<RLOptions>, "handler">
/**
 * Decorator function that adds rate limiting to a method.
 *
 * @param {number | "noLimit"} [limit] - The maximum number of requests allowed within the time window. If set to "noLimit", there is no limit.
 * @param {number} [timeout=0] - The time window in minutes for the rate limit. Default is 1 minute.
 * @return {Function} - A decorator function that adds rate limiting to a method.
 */
export function UseLimiter(limit?: number | "noLimit", timeout: number = 0): Function {
    return (target: any, key: any, descriptor: PropertyDescriptor) => {
        if (limit === "noLimit") limit = 60
        if (timeout === 0) timeout = 1;
        const options = {
            windowMs: timeout * 60 * 1000, // 15 minutes
            max: 5, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
            // standardHeaders: 'draft-7', // draft-6: RateLimit-* headers; draft-7: combined RateLimit header
            // legacyHeaders: false, // X-RateLimit-* headers

            handler: ThrottleException
        };
        descriptor.value = rateLimit(options)
        return descriptor;
    };
}
/**
* A decorator function that sets the HTTP status code for a route handler.
*
* @param {number} statusCode - The HTTP status code to set.
* @return {Function} - A decorator function that sets the HTTP status code for a route handler.
*/
export function HttpStatus<T extends keyof typeof HttpStatusCode | number>(statusCode: T) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            if (typeof statusCode === 'string') {
                res.status(HttpStatusCode[statusCode]);
                return originalMethod.call(this, req, res, next);
            }
            res.status(statusCode);
            return originalMethod.call(this, req, res, next);
        };

        return descriptor;
    };
}

/**
 * Redirects the user to the specified URL.
 *
 * @param {string} url - The URL to redirect to.
 * @return {Function} - A decorator function that redirects the user to the specified URL.
 */
export function Redirect(url: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            res.redirect(url);
        };
        return descriptor;
    };
}

/**
 * Returns a decorator function that delays the response using the provided delay function.
 * @UseDelay((req, res, next) => {
    console.log('Interceptor called');
    return new Observable(observer => {
      // Perform some asynchronous operation
      setTimeout(() => {
        console.log('Interceptor completed');
        observer.next();
        observer.complete();
      }, 3000);
    });
  })
 * @param {Function} delayFunc - The function that introduces the delay.
 * @return {Function} The decorator function for delaying the response.
 */
export function UseDelayResponse(delayFunc: (req: Request, res: Response, next: () => void) => Observable<any>) {
    Logging.dev("Delay in Response is Initiated")
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = function (req: any, res: any, next: () => void) {
            delayFunc(req, res, next).subscribe(() => {
                originalMethod.apply(this, [req, res, next]);
            });
        };
        return descriptor;
    };
}

/**
 * Throttles the API calls based on the specified delay.
 *
 * @param {number} delay - The delay in milliseconds for throttling.
 * @return {Function} The throttled function for API calls.
 */
export function ThrottleApi(delay: number) {
    Logging.dev("Response Throttling in API is Enabled")
    let lastExecution = 0;
    return function (target: any, key: any, descriptor: { value: (...args: any[]) => Promise<any>; }) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any) {
            const now = Date.now();
            if (now - lastExecution >= delay) {
                lastExecution = now;
                return originalMethod.apply(this, args);
            } else {
                console.log(`Method ${key} throttled.`);
            }
        };
    };
}
/**
 * A decorator function that adds validation logic to the target method.
 *
 * @param {any[]} validations - Array of validation rules to apply.
 * @returns {PropertyDescriptor} The updated property descriptor with validation logic.
 */
export function Validate(validations: any[]) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (req: any, res: any, next: () => void) {
            // Validator.forFeature(validations)(req, res, next);
            await Promise.all(validations.map((rule: any) => rule.run(req)));
            const errors = validationResult(req);
            const err = errors.formatWith(x => x.msg).array()
            if (!errors.isEmpty()) {
                return res.status(422).json({ message: "Validation Error", result: err, success: false })
            }
            return originalMethod.apply(this, arguments);
        };
        return descriptor;
    };
}
/**
 * Decorator function that checks if the user has the required roles to access a protected route.
 *
 * @template T - The type of the allowed roles.
 * @param {Array<T>|T} allowedRoles - The roles that are allowed to access the route.
 * @return {Function} - The decorator function that checks the user's roles.
 */
export function Accessible<T = AllowedRoles[]>(allowedRoles: T) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            try {
                const user = (req as any).user
                if (!user) {
                    return res.status(401).json({ message: 'User not authenticated', result: null, success: false });
                }
                const userRoles = (user.role).toUpperCase() || [];

                const hasRole = Array.isArray(allowedRoles)
                    ? allowedRoles.some(role => userRoles.includes(role.toUpperCase())!)
                    : userRoles.includes(allowedRoles);

                if (!hasRole) {
                    return res.status(401).json({ message: "Access Denied", result: null, success: false })
                }

                return originalMethod.apply(this, [req, res, next]);
            } catch (error) {
                return res.status(500).json({ message: "Internal Server Error", result: "Something went wrong", success: false })
            }
        };

        return descriptor;
    };
}

/**
 * Decorator function that checks if the user is authorized to access a protected route.
 *
 * @param {Object} opts - An object containing the option to make the route public.
 * @param {boolean} opts.isPublic - If true, the route is public and does not require authentication.
 * @throws {Error} If JWT_SECRET_KEY is not defined in the .env file.
 * @return {Function} - The decorator function that checks the user's authorization.
 */
export function isAuthorized(opts: { isPublic: boolean } = { isPublic: false }) {
    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY
    if (JWT_SECRET_KEY === undefined) {
        throw new Error("JWT_SECRET_KEY is not defined, please set it in .env file");
    }
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = function (req: Request, res: Response, next: NextFunction) {
            try {
                if (opts.isPublic) return next();
                const authHeader = req.headers["authorization"] as String || null

                if (!authHeader) {
                    return res.status(400).json({ message: "Authorization header is missing", result: null, success: false })
                }
                if (authHeader.trim() === "" || authHeader.includes("JWT ")) {
                    return res.status(400).json({ message: "Token is missing", result: null, success: false })
                }
                const token = authHeader?.replace("JWT ", "")
                if (!token) {
                    return res.status(401).json({ message: "Authorization Token is missing", result: null, success: false })
                }
                const decodedToken = jwt.verify(token, String(JWT_SECRET_KEY)) as IUser<any>
                if (!decodedToken) {
                    return res.status(401).json({ message: "Invalid Token", result: null, success: false })
                }
                (req as any).user = decodedToken;

                return originalMethod.apply(this, [req, res, next]);
            } catch (error) {
                return res.status(401).json({ message: "Token is invalid", result: null, success: false })
            }
        };

        return descriptor;
    }
}
/**
 * Decorator to handle setInterval.
 *
 * @param {number} intervalTime - The time in milliseconds to wait before executing the original method.
 * @return {Function} - A decorator function that wraps the original method with a setInterval.
 */
export function HandleInterval(intervalTime: number) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const originalFunction = originalMethod.apply(this, args);
            const intervalObservable = interval(intervalTime);

            const subscription = intervalObservable.subscribe(() => {
                originalFunction.apply(this, args);
            });

            return subscription;
        };

        return descriptor;
    };
}

/**
 * Decorator function to handle setTimeout.
 *
 * @param {number} timeout - The time in milliseconds to wait before executing the original method.
 * @return {Function} - A decorator function that wraps the original method with a setTimeout.
 */
export function HandleTimeout(timeout: number) {
    return function (target: any, key: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const originalFunction = originalMethod.apply(this, args);
            const timeoutObservable = timer(timeout);

            const subscription = timeoutObservable.subscribe(() => {
                originalFunction.apply(this, args);
            });

            return subscription;
        };

        return descriptor;
    };
}
export function createDecorator(metadataKey: string, metadataValue: any): MethodDecorator {
    return function (target, propertyKey, descriptor) {
        Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value!);
    };
}
export function AutoLoad(app: any, controllers: any[], globalPrefix: string = '') {

    controllers.forEach(controllerClass => {
        const router = Router();
        const basePath = Reflect.getMetadata('basePath', controllerClass) as string;
        const globalMiddlewares = Reflect.getMetadata(MIDDLEWARE_KEY, controllerClass) || [];
        const instance = new controllerClass();

        const routes: RouteDefinition[] = Reflect.getMetadata(ROUTES_KEY, controllerClass.prototype) || [];
        routes.forEach((route) => {
            const handler = (req: Request, res: Response, next: NextFunction) => {

                const requestParameters = Reflect.getMetadata('requestParameter', instance, route.handlerName);
                const responseParameters = Reflect.getMetadata('responseParameter', instance, route.handlerName);


                const bodyIndices: Record<string, number> = getIndices(instance, route.handlerName, 'body');
                const queryIndices: Record<string, number> = getIndices(instance, route.handlerName, 'query');
                const paramIndices: Record<string, number> = getIndices(instance, route.handlerName, 'param')
                const headerIndices: Record<string, number> = getIndices(instance, route.handlerName, 'header')
                const cookieIndices: Record<string, number> = getIndices(instance, route.handlerName, 'cookie')
                const args = [];

                if (requestParameters !== undefined) args[requestParameters] = req;
                if (responseParameters !== undefined) args[responseParameters] = res;

                applyIndices(args, req.body, bodyIndices, 'any');
                applyIndices(args, req.query, queryIndices, 'any');
                applyIndices(args, req.params, paramIndices, 'any');
                applyIndices(args, req.headers, headerIndices, 'any');
                applyIndices(args, req.cookies, cookieIndices, 'any');
                const redirect = Reflect.getMetadata('redirect', instance[route.handlerName]);
                const statusCode = Reflect.getMetadata('statusCode', instance[route.handlerName]) || 200;               

                const result = (instance as any)[route.handlerName](...args);
                
                if (redirect) {
                    return res.redirect(redirect);
                }
                if (statusCode) {
                    return res.status(statusCode).json(result);
                }
                if (result instanceof Promise) {
                    result.then((value: any) => res.json(value)).catch(next);
                } else {
                    res.json(result);
                }
            };
            const middlewares = [...globalMiddlewares, ...route.middlewares!, handler];
            router[route.method](route.path, ...middlewares);
        });
        globalPrefix = app.get("globalPrefix") || "";
        const normalizedPath = (globalPrefix + basePath).replace(/\/{2,}/g, '/')
        app.use(normalizedPath, router);
    })
}
function getIndices(instance: any, handlerName: string, type: string): Record<string, number> {
    return Reflect.getMetadataKeys(instance, handlerName)
        .filter((key: string) => key.startsWith(`${type}:`))
        .reduce((acc: Record<string, number>, key: string) => {
            acc[key.split(':')[1]] = Reflect.getMetadata(key, instance, handlerName);
            return acc;
        }, {} as Record<string, number>);
}
function applyIndices(args: any[], source: any, indices: Record<string, number>, anyKey: string) {
    Object.entries(indices).forEach(([name, index]) => {
        if (name === anyKey) args[index] = source;
        else args[index] = source[name];
    });
}