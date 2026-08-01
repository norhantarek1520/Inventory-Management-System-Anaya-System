import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  createUser(@Body() user) {
    return this.userService.CreateUser(user);
  }

  @Get()
  getAllUsers() {
    console.log('Fetching all users...');
    return this.userService.GetAllUsers();
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.userService.GetUserById(id);
  }

  @Put(':id')
  updateUser(@Param('id') id: string, @Body() user) {
    return this.userService.UpdateUser(id, user);
  }

  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.userService.DeleteUser(id);
  }
}
