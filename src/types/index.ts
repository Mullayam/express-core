import { Request, Response, NextFunction } from "express";
import { UploadedFile } from "express-fileupload";

export type RoutingMethods = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'all'

type Constructor<T = any> = new (...args: any[]) => T;


export interface RouteDefinition {
    path: string;
    method: RoutingMethods;
    handlerName: string;
    middlewares?: Function[];
}


export type RouteMethods = string[];
export type Middlewares = string[];

export interface Endpoint {
    path: string;
    methods: RouteMethods;
    middlewares: Middlewares;
}

export interface StackItem {
    route?: any;
    regexp?: RegExp;
    name?: string;
    path?: string;
    handle: any;
    keys: any[];
    methods: RouteMethods;
}
export type Type<C extends object = object> = new (...args: any) => C;
export interface ExpressRequest<T, U> extends Express.Request {
    body: U,
    query: T
}
export interface ResponseHandler<T = Record<string, any>> {
    success: boolean;
    message: string;
    result: null | T;
}
export interface ExpressMiddleware {
    activate(req: Request, res: Response, next: NextFunction): void;
}
export type IUser<T> = {
    [key in keyof T]: T[keyof T];
};
export enum USER_STATUS {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    BANNED = 'BANNED',
    DELETED = 'DELETED',
    PENDING = 'PENDING',
    SUSPENDED = 'SUSPENDED',
    BLOCKED = 'BLOCKED'
}
export const USER_STATUS_AND_ERROR = {
    [USER_STATUS.INACTIVE]: "Your Account is Not Active,Please Verify Your Email",
    [USER_STATUS.BANNED]: "Your Account is Banned,Please Contact Administrator",
    [USER_STATUS.DELETED]: "No Account With This Email Found",
    [USER_STATUS.PENDING]: "Your Account is Pending,Please Wait For Approval",
    [USER_STATUS.SUSPENDED]: "Your Account is Suspended,Due to violation of Terms and Conditions",
    [USER_STATUS.BLOCKED]: "Your Account is Blocked,Due to Many Failed Login Attempts",
}
export enum AppRoles {
    User = 'USER',
    Admin = 'ADMIN',
    SuperViser = 'SUPERVISER',
    Manager = 'MANAGER',
    SuperAdmin = 'SUPERADMIN',
}
export enum Action {
    Manage = 'manage',
    Create = 'create',
    Read = 'read',
    Update = 'update',
    Delete = 'delete',
}

export const UserRolesArray = Object.values(AppRoles);
export type AllowedRoles = keyof typeof AppRoles;
export enum ColorCode {
    black = '\u001b[30m',
    red = '\u001b[31m',
    green = '\u001b[32m',
    orange = '\u001b[33m',
    blue = '\u001b[34m',
    purple = '\u001b[35m',
    cyan = '\u001b[36m',
    white = '\u001b[37m',
    reset = '\u001b[39m'
};
export type LoggingLevel = "emerg" | "alert" | "crit" | "error" | "notice" | "info" | "debug"
export type StorageType = "Redis" | "Memory" | "Disk"

export interface HttpStatusName {
    OK: number;
    CREATED: number;
    ACCEPTED: number;
    NO_CONTENT: number;
    BAD_REQUEST: number;
    UNAUTHORIZED: number;
    FORBIDDEN: number;
    NOT_FOUND: number;
    DUPLICATE: number;
    INTERNAL_SERVER_ERROR: number;

}
export enum HttpStatusCode {
    // Informational
    CONTINUE = 100,
    SWITCHING_PROTOCOLS = 101,
    PROCESSING = 102,

    // Success
    OK = 200,
    CREATED = 201,
    ACCEPTED = 202,
    NON_AUTHORITATIVE_INFORMATION = 203,
    NO_CONTENT = 204,
    RESET_CONTENT = 205,
    PARTIAL_CONTENT = 206,
    MULTI_STATUS = 207,
    ALREADY_REPORTED = 208,
    IM_USED = 226,

    // Redirection
    MULTIPLE_CHOICES = 300,
    MOVED_PERMANENTLY = 301,
    FOUND = 302,
    SEE_OTHER = 303,
    NOT_MODIFIED = 304,
    USE_PROXY = 305,
    SWITCH_PROXY = 306,
    TEMPORARY_REDIRECT = 307,
    PERMANENT_REDIRECT = 308,

    // Client Error
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    PAYMENT_REQUIRED = 402,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    METHOD_NOT_ALLOWED = 405,
    NOT_ACCEPTABLE = 406,
    PROXY_AUTHENTICATION_REQUIRED = 407,
    REQUEST_TIMEOUT = 408,
    CONFLICT = 409,
    GONE = 410,
    LENGTH_REQUIRED = 411,
    PRECONDITION_FAILED = 412,
    PAYLOAD_TOO_LARGE = 413,
    URI_TOO_LONG = 414,
    UNSUPPORTED_MEDIA_TYPE = 415,
    RANGE_NOT_SATISFIABLE = 416,
    EXPECTATION_FAILED = 417,
    I_AM_A_TEAPOT = 418,
    MISDIRECTED_REQUEST = 421,
    UNPROCESSABLE_ENTITY = 422,
    LOCKED = 423,
    FAILED_DEPENDENCY = 424,
    UPGRADE_REQUIRED = 426,
    PRECONDITION_REQUIRED = 428,
    TOO_MANY_REQUESTS = 429,
    REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
    UNAVAILABLE_FOR_LEGAL_REASONS = 451,

    // Server Error
    INTERNAL_SERVER_ERROR = 500,
    NOT_IMPLEMENTED = 501,
    BAD_GATEWAY = 502,
    SERVICE_UNAVAILABLE = 503,
    GATEWAY_TIMEOUT = 504,
    HTTP_VERSION_NOT_SUPPORTED = 505,
    VARIANT_ALSO_NEGOTIATES = 506,
    INSUFFICIENT_STORAGE = 507,
    LOOP_DETECTED = 508,
    NOT_EXTENDED = 510,
    NETWORK_AUTHENTICATION_REQUIRED = 511,
}
export interface HttpExceptionParams {
    name: keyof HttpStatusCodes;
    message: string;
    stack?: string | any
}
export type HttpStatusCodes = {
    "FOUND": 302,
    "SEE_OTHER": 303,
    "NOT_MODIFIED": 304,
    "TEMPORARY_REDIRECT": 307,
    "RESUME_INCOMPLETE": 308,
    "OK": 200,
    "CREATED": 201,
    "ACCEPTED": 202,
    "NON_AUTHORITATIVE_INFORMATION": 203,
    "NO_CONTENT": 204,
    "RESET_CONTENT": 205,
    "PARTIAL_CONTENT": 206,
    "BAD_REQUEST": 400,
    "UNAUTHORIZED": 401,
    "FORBIDDEN": 403,
    "NOT_FOUND": 404,
    "METHOD_NOT_ALLOWED": 405,
    "REQUEST_TIMEOUT": 408,
    "CONFLICT": 409,
    "GONE": 410,
    "LENGTH_REQUIRED": 411,
    "PRECONDITION_FAILED": 412,
    "PAYLOAD_TOO_LARGE": 413,
    "REQUESTED_RANGE_NOT_SATISFIABLE": 416,
    "TOO_MANY_REQUESTS": 429,
    "CLIENT_CLOSED_REQUEST": 499,
    "INTERNAL_SERVER_ERROR": 500,
    "BAD_GATEWAY": 502,
    "SERVICE_UNAVAILABLE": 503,
    "GATEWAY_TIMEOUT": 504,
}

export interface FileUploadOptions {
    fileName?: boolean;
    uploadDirPath?: string;
}
export interface FileHandler extends UploadedFile {
    name: string;
    /** A function to move the file elsewhere on your server */
    mv(path: string, callback: (err: any) => void): void;
    mv(path: string): Promise<void>;
    /** Encoding type of the file */
    encoding: string;
    /** The mimetype of your file */
    mimetype: string;
    /** A buffer representation of your file, returns empty buffer in case useTempFiles option was set to true. */
    data: Buffer;
    /** A path to the temporary file in case useTempFiles option was set to true. */
    tempFilePath: string;
    /** A boolean that represents if the file is over the size limit */
    truncated: boolean;
    /** Uploaded size in bytes */
    size: number;
    /** MD5 checksum of the uploaded file */
    md5: string;
}
export interface FileValidationArgs {
    field: string
    allowedMimeTypes: string[]
    strict?: boolean
}

export interface FileValidationOptions {
    minFieldsRequired?: number
}
export enum CronExpression {
    EVERY_SECOND = '* * * * * *',
    EVERY_5_SECONDS = '*/5 * * * * *',
    EVERY_10_SECONDS = '*/10 * * * * *',
    EVERY_30_SECONDS = '*/30 * * * * *',
    EVERY_MINUTE = '*/1 * * * *',
    EVERY_5_MINUTES = '0 */5 * * * *',
    EVERY_10_MINUTES = '0 */10 * * * *',
    EVERY_30_MINUTES = '0 */30 * * * *',
    EVERY_HOUR = '0 0-23/1 * * *',
    EVERY_2_HOURS = '0 0-23/2 * * *',
    EVERY_3_HOURS = '0 0-23/3 * * *',
    EVERY_4_HOURS = '0 0-23/4 * * *',
    EVERY_5_HOURS = '0 0-23/5 * * *',
    EVERY_6_HOURS = '0 0-23/6 * * *',
    EVERY_7_HOURS = '0 0-23/7 * * *',
    EVERY_8_HOURS = '0 0-23/8 * * *',
    EVERY_9_HOURS = '0 0-23/9 * * *',
    EVERY_10_HOURS = '0 0-23/10 * * *',
    EVERY_11_HOURS = '0 0-23/11 * * *',
    EVERY_12_HOURS = '0 0-23/12 * * *',
    EVERY_DAY_AT_1AM = '0 01 * * *',
    EVERY_DAY_AT_2AM = '0 02 * * *',
    EVERY_DAY_AT_3AM = '0 03 * * *',
    EVERY_DAY_AT_4AM = '0 04 * * *',
    EVERY_DAY_AT_5AM = '0 05 * * *',
    EVERY_DAY_AT_6AM = '0 06 * * *',
    EVERY_DAY_AT_7AM = '0 07 * * *',
    EVERY_DAY_AT_8AM = '0 08 * * *',
    EVERY_DAY_AT_9AM = '0 09 * * *',
    EVERY_DAY_AT_10AM = '0 10 * * *',
    EVERY_DAY_AT_11AM = '0 11 * * *',
    EVERY_DAY_AT_NOON = '0 12 * * *',
    EVERY_DAY_AT_1PM = '0 13 * * *',
    EVERY_DAY_AT_2PM = '0 14 * * *',
    EVERY_DAY_AT_3PM = '0 15 * * *',
    EVERY_DAY_AT_4PM = '0 16 * * *',
    EVERY_DAY_AT_5PM = '0 17 * * *',
    EVERY_DAY_AT_6PM = '0 18 * * *',
    EVERY_DAY_AT_7PM = '0 19 * * *',
    EVERY_DAY_AT_8PM = '0 20 * * *',
    EVERY_DAY_AT_9PM = '0 21 * * *',
    EVERY_DAY_AT_10PM = '0 22 * * *',
    EVERY_DAY_AT_11PM = '0 23 * * *',
    EVERY_DAY_AT_MIDNIGHT = '0 0 * * *',
    EVERY_WEEK = '0 0 * * 0',
    EVERY_WEEKDAY = '0 0 * * 1-5',
    EVERY_WEEKEND = '0 0 * * 6,0',
    EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT = '0 0 1 * *',
    EVERY_1ST_DAY_OF_MONTH_AT_NOON = '0 12 1 * *',
    EVERY_2ND_HOUR = '0 */2 * * *',
    EVERY_2ND_HOUR_FROM_1AM_THROUGH_11PM = '0 1-23/2 * * *',
    EVERY_2ND_MONTH = '0 0 1 */2 *',
    EVERY_QUARTER = '0 0 1 */3 *',
    EVERY_6_MONTHS = '0 0 1 */6 *',
    EVERY_YEAR = '0 0 1 0 *',
    EVERY_30_MINUTES_BETWEEN_9AM_AND_5PM = '0 */30 9-17 * * *',
    EVERY_30_MINUTES_BETWEEN_9AM_AND_6PM = '0 */30 9-18 * * *',
    EVERY_30_MINUTES_BETWEEN_10AM_AND_7PM = '0 */30 10-19 * * *',
    MONDAY_TO_FRIDAY_AT_1AM = '0 0 01 * * 1-5',
    MONDAY_TO_FRIDAY_AT_2AM = '0 0 02 * * 1-5',
    MONDAY_TO_FRIDAY_AT_3AM = '0 0 03 * * 1-5',
    MONDAY_TO_FRIDAY_AT_4AM = '0 0 04 * * 1-5',
    MONDAY_TO_FRIDAY_AT_5AM = '0 0 05 * * 1-5',
    MONDAY_TO_FRIDAY_AT_6AM = '0 0 06 * * 1-5',
    MONDAY_TO_FRIDAY_AT_7AM = '0 0 07 * * 1-5',
    MONDAY_TO_FRIDAY_AT_8AM = '0 0 08 * * 1-5',
    MONDAY_TO_FRIDAY_AT_9AM = '0 0 09 * * 1-5',
    MONDAY_TO_FRIDAY_AT_09_30AM = '0 30 09 * * 1-5',
    MONDAY_TO_FRIDAY_AT_10AM = '0 0 10 * * 1-5',
    MONDAY_TO_FRIDAY_AT_11AM = '0 0 11 * * 1-5',
    MONDAY_TO_FRIDAY_AT_11_30AM = '0 30 11 * * 1-5',
    MONDAY_TO_FRIDAY_AT_12PM = '0 0 12 * * 1-5',
    MONDAY_TO_FRIDAY_AT_1PM = '0 0 13 * * 1-5',
    MONDAY_TO_FRIDAY_AT_2PM = '0 0 14 * * 1-5',
    MONDAY_TO_FRIDAY_AT_3PM = '0 0 15 * * 1-5',
    MONDAY_TO_FRIDAY_AT_4PM = '0 0 16 * * 1-5',
    MONDAY_TO_FRIDAY_AT_5PM = '0 0 17 * * 1-5',
    MONDAY_TO_FRIDAY_AT_6PM = '0 0 18 * * 1-5',
    MONDAY_TO_FRIDAY_AT_7PM = '0 0 19 * * 1-5',
    MONDAY_TO_FRIDAY_AT_8PM = '0 0 20 * * 1-5',
    MONDAY_TO_FRIDAY_AT_9PM = '0 0 21 * * 1-5',
    MONDAY_TO_FRIDAY_AT_10PM = '0 0 22 * * 1-5',
    MONDAY_TO_FRIDAY_AT_11PM = '0 0 23 * * 1-5',
}