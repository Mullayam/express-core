import { Service } from '../services/test.service';
import { Controller, Get, Post, Query, Body, Header, Inject } from '@enjoys/express-core';



@Controller('/my')
export class MyController {
    @Inject(Service)
    private myservice!: Service

    @Get('/')
    getAll(@Query() queryParams: any) {

        return this.myservice.getHello()
    }
    @Post()
    getAllerr(@Body('email') email: any, @Query() queryParams: any, @Header() headers: any) {
        return ({ email, queryParams, headers })
    }
} 