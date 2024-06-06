import { Injectable } from "@enjoys/express-core";

@Injectable()
export class Service {
    getHello() {
        return { message: 'Hello World!' }
    }
}